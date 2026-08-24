import fs from "node:fs/promises";
import path from "node:path";

function isPermissionError(err) {
  return err && (err.code === "EACCES" || err.code === "EPERM");
}

/**
 * @param {string} child
 * @param {string} parent
 * @returns {boolean}
 */
function isInsidePath(child, parent) {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  if (resolvedChild === resolvedParent) {
    return true;
  }
  const rel = path.relative(resolvedParent, resolvedChild);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Refuse writes when an existing ancestor directory under `boundary` is a symlink.
 *
 * @param {string} destPath
 * @param {string} boundary
 */
export async function assertNoSymlinkAncestors(destPath, boundary) {
  const resolvedBoundary = path.resolve(boundary);
  let current = path.dirname(path.resolve(destPath));

  while (isInsidePath(current, resolvedBoundary) && current !== resolvedBoundary) {
    try {
      const st = await fs.lstat(current);
      if (st.isSymbolicLink()) {
        throw new Error(
          `Refusing to write under symlinked directory: ${current} — ` +
            "remove the link or choose another destination before installing.",
        );
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        // Parent not created yet — keep walking toward the boundary.
      } else if (isPermissionError(err)) {
        throw new Error(`Permission denied: cannot access ${current}`);
      } else {
        throw err;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
}

/**
 * Refuse to overwrite through a symlink (install must not clobber .env etc.).
 * Used for packaged copies, remote downloads, memory files, and `.cursorrules`.
 *
 * @param {string} destPath
 * @param {{ boundary?: string }} [options]
 */
export async function assertSafeWriteTarget(destPath, options = {}) {
  if (options.boundary) {
    await assertNoSymlinkAncestors(destPath, options.boundary);
  }

  let st;
  try {
    st = await fs.lstat(destPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return;
    }
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot access ${destPath}`);
    }
    throw err;
  }

  if (st.isSymbolicLink()) {
    throw new Error(
      `Refusing to write through symlink: ${destPath} — ` +
        "remove the link or choose another destination before installing.",
    );
  }
}

export async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot create ${dirPath}`);
    }
    throw err;
  }
}

export async function writeFileIfMissing(filePath, content, options = {}) {
  await assertSafeWriteTarget(filePath, options);

  try {
    await fs.writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (err) {
    if (err.code === "EEXIST") {
      return false;
    }
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot write ${filePath}`);
    }
    throw err;
  }
}

export async function appendFileSafe(filePath, content, options = {}) {
  await assertSafeWriteTarget(filePath, options);

  try {
    await fs.appendFile(filePath, content, "utf8");
  } catch (err) {
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot write ${filePath}`);
    }
    throw err;
  }
}

export async function writeFileSafe(filePath, content, options = {}) {
  await assertSafeWriteTarget(filePath, options);

  try {
    await fs.writeFile(filePath, content, "utf8");
  } catch (err) {
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot write ${filePath}`);
    }
    throw err;
  }
}

export async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot read ${filePath}`);
    }
    throw err;
  }
}

export async function removeFileSafe(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return;
    }
    if (isPermissionError(err)) {
      throw new Error(`Permission denied: cannot remove ${filePath}`);
    }
    throw err;
  }
}

export { isPermissionError };
