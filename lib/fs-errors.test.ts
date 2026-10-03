import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { isMissingFileError } from "./fs-errors";

describe("isMissingFileError", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeFixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-errors-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  function errorFrom(read: () => unknown): unknown {
    try {
      read();
    } catch (error) {
      return error;
    }
    throw new Error("expected the read to fail");
  }

  it("recognizes a real ENOENT from reading a missing file", () => {
    const root = makeFixture();
    const error = errorFrom(() =>
      fs.readFileSync(path.join(root, "missing.json"), "utf8"),
    );
    expect(isMissingFileError(error)).toBe(true);
  });

  // A directory sitting at the file path exists, so it is a broken archive
  // rather than a missing day and must not be treated as a miss.
  it("rejects EISDIR from reading a directory", () => {
    const root = makeFixture();
    const error = errorFrom(() => fs.readFileSync(root, "utf8"));
    expect(isMissingFileError(error)).toBe(false);
  });

  it("rejects a parse failure", () => {
    const error = errorFrom(() => JSON.parse("{not json"));
    expect(error).toBeInstanceOf(SyntaxError);
    expect(isMissingFileError(error)).toBe(false);
  });

  // Only genuine Error instances carry a trustworthy errno code; a plain
  // object that merely looks like one is not a filesystem error.
  it("rejects non-Error values, even ones shaped like an ENOENT", () => {
    expect(isMissingFileError({ code: "ENOENT" })).toBe(false);
    expect(isMissingFileError("ENOENT")).toBe(false);
    expect(isMissingFileError(null)).toBe(false);
    expect(isMissingFileError(undefined)).toBe(false);
  });

  it("rejects an Error with a different code", () => {
    const error = Object.assign(new Error("denied"), { code: "EACCES" });
    expect(isMissingFileError(error)).toBe(false);
  });
});
