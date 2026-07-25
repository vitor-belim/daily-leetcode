import { describe, it, expect } from "vitest";
import path from "path";
import { problemFilePath, solutionFilePath, PROBLEMS_ROOT, SOLUTIONS_ROOT } from "./paths";

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
