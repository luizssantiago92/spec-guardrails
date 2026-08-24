import path from "node:path";

import { packagedAssetPath } from "./assets.js";
import {
  LESSONS_HEADER,
  STATE_HEADER,
} from "./constants.js";
import { ensureDir, readFileSafe, writeFileIfMissing } from "./fs-utils.js";

export async function initGuardrailsMemory(cwd, options = {}) {
  const boundary = options.boundary ?? cwd;
  const writeOptions = { boundary };
  const specsDir = path.join(cwd, ".specs");
  const featuresDir = path.join(specsDir, "features");
  const projectDir = path.join(specsDir, "project");
  const domainsDir = path.join(specsDir, "domains");

  await ensureDir(featuresDir);
  await ensureDir(projectDir);
  await ensureDir(domainsDir);

  const stateCreated = await writeFileIfMissing(
    path.join(specsDir, "STATE.md"),
    STATE_HEADER,
    writeOptions,
  );
  const lessonsCreated = await writeFileIfMissing(
    path.join(specsDir, "LESSONS.md"),
    LESSONS_HEADER,
    writeOptions,
  );
  await writeFileIfMissing(
    path.join(specsDir, "config.yaml.example"),
    await readFileSafe(packagedAssetPath("templates/config.yaml.example")),
    writeOptions,
  );

  return { stateCreated, lessonsCreated };
}
