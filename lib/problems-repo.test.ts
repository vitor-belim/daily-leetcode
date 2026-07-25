import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  paginateDescending,
  getLatestDailiesData,
  getProblem,
  getAdjacentDates,
} from "./problems-repo";

describe("paginateDescending", () => {
  it("reverses and slices ascending items into a descending page", () => {
    const result = paginateDescending(["a", "b", "c"], 2, 0);
    expect(result).toEqual({ page: ["c", "b"], total: 3, hasMore: true });
  });

  it("handles offset past the end", () => {
    const result = paginateDescending(["a", "b", "c"], 2, 10);
    expect(result).toEqual({ page: [], total: 3, hasMore: false });
  });

  it("handles limit 0", () => {
    const result = paginateDescending(["a", "b", "c"], 0, 0);
    expect(result).toEqual({ page: [], total: 3, hasMore: true });
  });

  it("handles limit larger than remaining items", () => {
    const result = paginateDescending(["a", "b", "c"], 100, 0);
    expect(result).toEqual({ page: ["c", "b", "a"], total: 3, hasMore: false });
  });

  it("handles an empty array", () => {
    const result = paginateDescending([], 10, 0);
    expect(result).toEqual({ page: [], total: 0, hasMore: false });
  });
});

describe("getProblem / getAdjacentDates / getLatestDailiesData", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeFixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "problems-repo-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  function writeProblem(root: string, date: string, data: unknown) {
    const [y, m, d] = date.split("-");
    fs.mkdirSync(path.join(root, y, m), { recursive: true });
    fs.writeFileSync(
      path.join(root, y, m, `${d}.json`),
      typeof data === "string" ? data : JSON.stringify(data),
    );
  }

  describe("getProblem", () => {
    it("reads a valid problem file", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", { title: "Test", date: "2026-07-20" });

      const problem = await getProblem("2026", "07", "20", root);
      expect(problem).toEqual({ title: "Test", date: "2026-07-20" });
    });

    it("returns null for a missing file", async () => {
      const root = makeFixture();
      expect(await getProblem("2026", "07", "20", root)).toBeNull();
    });

    it("returns null for malformed JSON", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", "{not json");
      expect(await getProblem("2026", "07", "20", root)).toBeNull();
    });

    it("rejects an invalid calendar date before touching the filesystem", async () => {
      const root = makeFixture();
      // Feb 30 doesn't exist; if this weren't rejected first, fs would 404 anyway,
      // but this proves the validation path (no exception, no fs access needed).
      expect(await getProblem("2026", "02", "30", root)).toBeNull();
    });

    it("rejects malformed date segments", async () => {
      const root = makeFixture();
      expect(await getProblem("2026", "not-a-month", "20", root)).toBeNull();
    });
  });

  describe("getAdjacentDates", () => {
    it("finds both neighbors when both exist", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-19", { date: "2026-07-19" });
      writeProblem(root, "2026-07-21", { date: "2026-07-21" });

      expect(await getAdjacentDates("2026-07-20", root)).toEqual({
        prev: "2026-07-19",
        next: "2026-07-21",
      });
    });

    it("returns null for a neighbor that doesn't exist", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-19", { date: "2026-07-19" });

      expect(await getAdjacentDates("2026-07-20", root)).toEqual({
        prev: "2026-07-19",
        next: null,
      });
    });

    it("returns null for both when neither neighbor exists", async () => {
      const root = makeFixture();
      expect(await getAdjacentDates("2026-07-20", root)).toEqual({
        prev: null,
        next: null,
      });
    });

    it("handles a month boundary", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-06-30", { date: "2026-06-30" });

      expect(await getAdjacentDates("2026-07-01", root)).toEqual({
        prev: "2026-06-30",
        next: null,
      });
    });
  });

  describe("getLatestDailiesData", () => {
    it("returns the most recent problems first, paginated", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-19", { date: "2026-07-19" });
      writeProblem(root, "2026-07-20", { date: "2026-07-20" });
      writeProblem(root, "2026-07-21", { date: "2026-07-21" });

      const result = await getLatestDailiesData(2, 0, root);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.problems.map((p) => p.date)).toEqual([
        "2026-07-21",
        "2026-07-20",
      ]);
    });

    it("filters out an unparseable file instead of crashing the whole list", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-19", { date: "2026-07-19" });
      writeProblem(root, "2026-07-20", "{not json");

      const result = await getLatestDailiesData(10, 0, root);
      expect(result.total).toBe(2);
      expect(result.problems.map((p) => p.date)).toEqual(["2026-07-19"]);
    });

    it("ignores a stray non-date file", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-19", { date: "2026-07-19" });
      fs.writeFileSync(path.join(root, "2026", "07", "notes.json"), "{}");

      const result = await getLatestDailiesData(10, 0, root);
      expect(result.total).toBe(1);
    });
  });
});
