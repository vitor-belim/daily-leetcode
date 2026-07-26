import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  problemFilePath,
  solutionFilePath,
  solutionFileExists,
  PROBLEMS_ROOT,
  SOLUTIONS_ROOT,
} from "./paths";

describe("problemFilePath", () => {
  it("builds the real path by default", () => {
    expect(problemFilePath("2026-07-25")).toBe(
      path.join(PROBLEMS_ROOT, "2026", "07", "25.json"),
    );
  });

  it("builds against an override root", () => {
    expect(problemFilePath("2026-07-25", "/tmp/fixture")).toBe(
      path.join("/tmp/fixture", "2026", "07", "25.json"),
    );
  });
});

describe("solutionFilePath", () => {
  it("builds the real path by default", () => {
    expect(solutionFilePath("2026-07-25")).toBe(
      path.join(SOLUTIONS_ROOT, "2026", "07", "25.json"),
    );
  });

  it("builds against an override root", () => {
    expect(solutionFilePath("2026-07-25", "/tmp/fixture")).toBe(
      path.join("/tmp/fixture", "2026", "07", "25.json"),
    );
  });
});

describe("solutionFileExists", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeFixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paths-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  it("returns false when the solutions file doesn't exist", () => {
    const root = makeFixture();
    expect(solutionFileExists("2026-07-25", root)).toBe(false);
  });

  it("returns true when the solutions file exists", () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "07"), { recursive: true });
    fs.writeFileSync(path.join(root, "2026", "07", "25.json"), "[]");

    expect(solutionFileExists("2026-07-25", root)).toBe(true);
  });
});
