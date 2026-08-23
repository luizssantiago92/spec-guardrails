import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { inferDomainFromFeature } from "../lib/archive.js";
import {
  assertSafeDomainSlug,
  isValidFeatureId,
  slugifyDomain,
} from "../lib/slug-utils.js";
import {
  featureDir,
  listFeatureIds,
  resolveFeatureId,
} from "../lib/specs-utils.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("slug utils", () => {
  it("validates feature ids", () => {
    assert.equal(isValidFeatureId("001-auth"), true);
    assert.equal(isValidFeatureId("042-chat-system"), true);
    assert.equal(isValidFeatureId("auth"), false);
    assert.equal(isValidFeatureId(".."), false);
    assert.equal(isValidFeatureId("001-"), false);
  });

  it("sanitizes domain slugs", () => {
    assert.equal(slugifyDomain("Chat System"), "chat-system");
    assert.equal(assertSafeDomainSlug("Billing"), "billing");
    assert.throws(() => assertSafeDomainSlug("../evil"), /Invalid domain slug/);
  });
});

describe("resolveFeatureId", () => {
  it("rejects path traversal ids", async () => {
    const cwd = await createTempDir("specs-utils-");
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });

    await assert.rejects(() => resolveFeatureId("..", cwd), /Invalid feature id/);
    await assert.rejects(() => resolveFeatureId(".", cwd), /Invalid feature id/);
    await assert.rejects(() => resolveFeatureId("auth", cwd), /Invalid feature id/);
  });

  it("resolves a canonical feature id", async () => {
    const cwd = await createTempDir("specs-utils-");
    const id = "001-auth";
    await fs.mkdir(path.join(cwd, ".specs/features", id), { recursive: true });

    assert.equal(await resolveFeatureId(id, cwd), id);
    assert.equal(await resolveFeatureId(`.specs/features/${id}/spec.md`, cwd), id);
    assert.deepEqual(await listFeatureIds(cwd), [id]);
    assert.equal(featureDir(id, cwd), path.join(cwd, ".specs/features", id));
  });

  it("rejects feature paths outside .specs/features", async () => {
    const cwd = await createTempDir("specs-utils-");
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });

    await assert.rejects(
      () => resolveFeatureId("../package.json", cwd),
      /No such feature or path/,
    );
  });
});

describe("archive domain slugs", () => {
  it("infers safe domain from feature id", () => {
    assert.equal(inferDomainFromFeature("003-chat-system"), "chat-system");
  });

  it("rejects unsafe archive domain overrides", () => {
    assert.throws(() => assertSafeDomainSlug("../tmp"), /Invalid domain slug/);
  });
});
