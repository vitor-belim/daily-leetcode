import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getProblem, getAdjacentDates, readProblemFile } from "./problems-repo";
import { Difficulty, type Problem } from "./types";

// A complete, valid problem record: the readers validate every field, so a
// partial fixture would be rejected as a corrupted file.
function problem(date: string, title = "Test"): Problem {
  return {
    title,
    difficulty: Difficulty.Easy,
    description: "<p>Statement</p>",
    link: "https://leetcode.com/problems/test/",
    date,
  };
}

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
      writeProblem(root, "2026-07-20", problem("2026-07-20"));

      expect(await getProblem("2026", "07", "20", root)).toEqual(
        problem("2026-07-20"),
      );
    });

    // Well-formed JSON with the wrong shape is as corrupt as malformed JSON:
    // a difficulty outside the enum must not pass for a typed Problem.
    it("throws for a difficulty outside the enum", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", {
        ...problem("2026-07-20"),
        difficulty: "Impossible",
      });
      await expect(getProblem("2026", "07", "20", root)).rejects.toThrow(
        TypeError,
      );
    });

    it("returns null for a missing file", async () => {
      const root = makeFixture();
      expect(await getProblem("2026", "07", "20", root)).toBeNull();
    });

    // A file that exists but fails to parse is a corrupted archive, not a
    // missing day: it must surface (error boundary, failed build) instead of
    // quietly becoming a 404.
    it("throws for malformed JSON instead of reporting a missing day", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", "{not json");
      await expect(getProblem("2026", "07", "20", root)).rejects.toThrow(
        SyntaxError,
      );
    });

    // A directory at the file path exists but can't be read as a file
    // (EISDIR), which is likewise a broken archive rather than a miss.
    it("throws when the file path is a directory", async () => {
      const root = makeFixture();
      fs.mkdirSync(path.join(root, "2026", "07", "20.json"), {
        recursive: true,
      });
      await expect(getProblem("2026", "07", "20", root)).rejects.toMatchObject({
        code: "EISDIR",
      });
    });

    // getProblem is wrapped in React's cache(), which only memoizes inside a
    // React server render; here (plain Node) every call must hit the disk, so
    // a rewrite between calls is visible.
    it("calls through to the filesystem outside a React server render", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", problem("2026-07-20", "First"));
      expect(await getProblem("2026", "07", "20", root)).toMatchObject({
        title: "First",
      });

      writeProblem(root, "2026-07-20", problem("2026-07-20", "Second"));
      expect(await getProblem("2026", "07", "20", root)).toMatchObject({
        title: "Second",
      });
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

    // A month path that is a file rather than a directory makes the
    // existence check fail with ENOTDIR, which is a broken archive and must
    // not be mistaken for "no neighbor".
    it("throws when an existence check fails for a reason other than a miss", async () => {
      const root = makeFixture();
      fs.mkdirSync(path.join(root, "2026"), { recursive: true });
      fs.writeFileSync(path.join(root, "2026", "07"), "");

      await expect(getAdjacentDates("2026-07-20", root)).rejects.toMatchObject({
        code: "ENOTDIR",
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
      writeProblem(root, "2026-07-20", problem("2026-07-20"));

      expect(await readProblemFile("2026-07-20", root)).toEqual(
        problem("2026-07-20"),
      );
    });

    // Only the known fields are kept, so stray keys in a file never reach
    // the page.
    it("drops fields the Problem type doesn't declare", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", {
        ...problem("2026-07-20"),
        extra: "ignored",
      });

      expect(await readProblemFile("2026-07-20", root)).toEqual(
        problem("2026-07-20"),
      );
    });

    // A missing required field is a corrupted file, not a missing day.
    it("throws when a required field is missing", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", { title: "Test", date: "2026-07-20" });

      await expect(readProblemFile("2026-07-20", root)).rejects.toThrow(
        TypeError,
      );
    });

    it("returns null for a missing file", async () => {
      const root = makeFixture();
      expect(await readProblemFile("2026-07-21", root)).toBeNull();
    });

    // The home list and stats are prerendered from this reader, so a
    // corrupted file has to fail the build loudly rather than silently drop
    // the day.
    it("throws for malformed JSON", async () => {
      const root = makeFixture();
      writeProblem(root, "2026-07-20", "{not json");

      await expect(readProblemFile("2026-07-20", root)).rejects.toThrow(
        SyntaxError,
      );
    });
  });
});
