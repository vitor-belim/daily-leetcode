import { describe, it, expect } from "vitest";
import { blogPath, dailiesPath } from "./routes";

describe("blogPath", () => {
  it("turns a YYYY-MM-DD day into its nested blog route", () => {
    expect(blogPath("2026-07-05")).toBe("/blog/2026/07/05");
  });
});

describe("dailiesPath", () => {
  it("points at the month-cursor route handler", () => {
    expect(dailiesPath("2026-04")).toBe("/api/dailies/2026-04");
  });
});
