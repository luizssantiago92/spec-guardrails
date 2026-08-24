import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FALLBACK_REPO_URL,
  PACKAGE_NAME,
  PINNED_REF,
  assertSafeAssetBase,
  resolveAssetOverride,
  resolveAssetUrl,
} from "./constants.js";
import { downloadToFile } from "./download.js";
import { assertSafeWriteTarget } from "./fs-utils.js";

const PACKAGE_ROOT = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

/**
 * Absolute path of a guardrails asset shipped inside the npm package.
 *
 * @param {string} remotePath path relative to the repo root (e.g. skills/agent-architecture.md)
 */
export function packagedAssetPath(remotePath) {
  const resolved = path.resolve(PACKAGE_ROOT, remotePath);
  const rootWithSep = PACKAGE_ROOT.endsWith(path.sep)
    ? PACKAGE_ROOT
    : PACKAGE_ROOT + path.sep;

  if (resolved !== PACKAGE_ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error(
      `Refusing packaged asset path outside package root: ${remotePath}`,
    );
  }

  return resolved;
}

/**
 * Default install copies from the package. A remote fetch happens only when
 * `SPEC_GUARDRAILS_REPO_URL` or `options.repoUrl` is set (forks and the test suite).
 *
 * @param {string} [repoUrl]
 * @returns {{ mode: "package" } | { mode: "remote", repoUrl: string }}
 */
export function resolveInstallSource(repoUrl) {
  const override = repoUrl ?? resolveAssetOverride();
  if (override) {
    return { mode: "remote", repoUrl: assertSafeAssetBase(override) };
  }
  return { mode: "package" };
}

/**
 * @param {string} remotePath
 * @param {string} destPath
 * @param {{ boundary?: string }} [options]
 */
export async function copyPackagedAsset(remotePath, destPath, options = {}) {
  const source = packagedAssetPath(remotePath);

  try {
    await fs.access(source);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(
        `Packaged guardrails asset missing: ${remotePath}. ` +
          `Reinstall ${PACKAGE_NAME}.`,
      );
    }
    throw err;
  }

  await assertSafeWriteTarget(destPath, options);

  try {
    await fs.copyFile(source, destPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`cannot write ${destPath} - destination directory missing`);
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(`Permission denied: cannot write ${destPath}`);
    }
    throw err;
  }
}

/**
 * Download one asset. Pin-tag fallback applies only when fetching the official
 * repo with no override (kept for the remote path; the default install no
 * longer uses it).
 *
 * @param {{ remotePath: string, destPath: string, repoUrl?: string, state: { warned: boolean }, log: (msg: string) => void, boundary?: string }} params
 */
export async function downloadRemoteAsset({
  remotePath,
  destPath,
  repoUrl,
  state,
  log,
  boundary,
}) {
  try {
    await downloadToFile(resolveAssetUrl(remotePath, repoUrl), destPath, { boundary });
    return;
  } catch (err) {
    const missingPinnedAsset =
      !repoUrl && /Download failed: 404/.test(err.message);

    if (!missingPinnedAsset) {
      throw err;
    }

    if (!state.warned) {
      state.warned = true;
      log(
        `⚠️  Tag ${PINNED_REF} has no published assets yet — ` +
          "falling back to the default branch.",
      );
    }
  }

  await downloadToFile(
    resolveAssetUrl(remotePath, FALLBACK_REPO_URL),
    destPath,
    { boundary },
  );
}

/**
 * @param {{ remotePath: string, destPath: string, source: ReturnType<typeof resolveInstallSource>, state: { warned: boolean }, log: (msg: string) => void, boundary?: string }} params
 */
export async function installAsset({ remotePath, destPath, source, state, log, boundary }) {
  if (source.mode === "package") {
    await copyPackagedAsset(remotePath, destPath, { boundary });
    return;
  }

  await downloadRemoteAsset({
    remotePath,
    destPath,
    repoUrl: source.repoUrl,
    state,
    log,
    boundary,
  });
}
