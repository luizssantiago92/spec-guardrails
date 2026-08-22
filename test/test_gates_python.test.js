import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePythonVersion,
  satisfiesMinPython,
} from "../lib/gates.js";

describe("python interpreter resolution helpers", () => {
  it("parses version strings from python --version output", () => {
    assert.deepEqual(parsePythonVersion("Python 3.12.4"), [3, 12]);
    assert.deepEqual(parsePythonVersion("Python 3.10.0"), [3, 10]);
    assert.equal(parsePythonVersion("invalid"), null);
  });

  it("requires Python 3.10 or newer", () => {
    assert.equal(satisfiesMinPython([3, 10]), true);
    assert.equal(satisfiesMinPython([3, 12]), true);
    assert.equal(satisfiesMinPython([3, 9]), false);
    assert.equal(satisfiesMinPython([2, 7]), false);
    assert.equal(satisfiesMinPython(null), false);
  });
});
