import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getProblem, getAdjacentDates, readProblemFile } from "./problems-repo";

describe("getProblem / getAdjacentDates / readProblemFile", () => {
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
    const [y = "", m = "", d = ""] = date.split("-");
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

  describe("readProblemFile", () => {
    it("reads a valid problem file", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", { title: "Test", date: "2026-07-20" });

      expect(await readProblemFile("2026-07-20", root)).toEqual({
        title: "Test",
        date: "2026-07-20",
      });
    });

    it("returns null for a missing or malformed file", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", "{not json");

      expect(await readProblemFile("2026-07-20", root)).toBeNull();
      expect(await readProblemFile("2026-07-21", root)).toBeNull();
    });
  });
});
