import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPythonCandidates,
  parsePythonVersion,
  satisfiesMinPython,
} from "../lib/gates.js";

describe("python interpreter resolution helpers", () => {
  it("parses version strings from python --version output", () => {
    assert.deepEqual(parsePythonVersion("Python 3.12.4"), [3, 12]);
    assert.deepEqual(parsePythonVersion("Python 3.10.0"), [3, 10]);
    assert.equal(parsePythonVersion("invalid"), null);
    assert.equal(parsePythonVersion("Something 3.9.0 embedded"), null);
  });

  it("prefers py -3 first on Windows", () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      assert.equal(getPythonCandidates()[0].command, "py");
      assert.deepEqual(getPythonCandidates()[0].args, ["-3"]);
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
  });

  it("requires Python 3.10 or newer", () => {
    assert.equal(satisfiesMinPython([3, 10]), true);
    assert.equal(satisfiesMinPython([3, 12]), true);
    assert.equal(satisfiesMinPython([3, 9]), false);
    assert.equal(satisfiesMinPython([2, 7]), false);
    assert.equal(satisfiesMinPython(null), false);
  });
});
