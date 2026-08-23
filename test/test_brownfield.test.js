import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildProjectMarkdown,
  detectDomainCandidates,
  detectProjectStack,
  projectInit,
} from "../lib/brownfield.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("brownfield project-init", () => {
  it("detects Node.js + TypeScript stack", async () => {
    const cwd = await createTempDir("stack-node-");
    await fs.mkdir(path.join(cwd, "src"));
    await fs.writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "@acme/api",
        scripts: { test: "node --test", lint: "eslint ." },
        devDependencies: { typescript: "5.0.0" },
      }),
    );

    const stack = await detectProjectStack(cwd);
    assert.equal(stack.stack, "Node.js + TypeScript");
    assert.equal(stack.preset, "node-ts");
    assert.equal(stack.testCommand, "npm test");
    assert.deepEqual(stack.roots, ["src"]);
  });

  it("detects domains from packages/ layout", async () => {
    const cwd = await createTempDir("domains-");
    await fs.mkdir(path.join(cwd, "packages/auth"), { recursive: true });
    await fs.mkdir(path.join(cwd, "packages/billing"), { recursive: true });
    await fs.mkdir(path.join(cwd, "packages/utils"), { recursive: true });

    const domains = await detectDomainCandidates(cwd);
    assert.deepEqual(
      domains.map((d) => d.domain),
      ["auth", "billing"],
    );
  });

  it("buildProjectMarkdown includes domain table", () => {
    const md = buildProjectMarkdown({
      repoName: "api",
      stack: {
        stack: "Node.js",
        testCommand: "npm test",
        roots: ["src"],
      },
      domains: [{ domain: "auth", hint: "packages/auth" }],
    });

    assert.match(md, /Project: api/);
    assert.match(md, /packages\/auth/);
  });

  it("project-init scaffolds PROJECT, domains, ROADMAP, and config", async () => {
    const cwd = await createTempDir("project-init-");
    await fs.mkdir(path.join(cwd, "packages/chat"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "chat-app", scripts: { test: "npm test" } }),
    );

    const result = await projectInit({ cwd, preset: "default" });
    assert.equal(result.dryRun, false);
    assert.equal(result.domains.length, 1);
    assert.equal(result.domains[0].domain, "chat");

    const project = await fs.readFile(path.join(cwd, ".specs/project/PROJECT.md"), "utf8");
    assert.match(project, /chat-app/);
    assert.match(project, /packages\/chat/);

    const domainSpec = await fs.readFile(
      path.join(cwd, ".specs/domains/chat/spec.md"),
      "utf8",
    );
    assert.match(domainSpec, /Domain: chat/);

    const roadmap = await fs.readFile(path.join(cwd, ".specs/project/ROADMAP.md"), "utf8");
    assert.match(roadmap, /chat/);

    const config = await fs.readFile(path.join(cwd, ".specs/config.yaml"), "utf8");
    assert.match(config, /schema: spec-driven/);
  });

  it("dry-run makes no filesystem changes", async () => {
    const cwd = await createTempDir("project-init-dry-");
    await fs.mkdir(path.join(cwd, "apps/payments"), { recursive: true });

    const result = await projectInit({ cwd, dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(result.domains[0].domain, "payments");

    await assert.rejects(() => fs.access(path.join(cwd, ".specs/STATE.md")));
  });

  it("rejects unsafe manual domain slugs", async () => {
    const cwd = await createTempDir("project-init-domain-");
    await fs.writeFile(path.join(cwd, "package.json"), JSON.stringify({ name: "app" }));

    await assert.rejects(
      () => projectInit({ cwd, domains: ["../evil"], skipProject: true }),
      /Invalid domain slug/,
    );
  });
});
