import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getSolutions, readSolutionsFile } from "./solutions-repo";
import { SolutionStatus, type Solution } from "./types";

// A complete, valid solution record: the readers validate every field, so a
// partial fixture would be rejected as a corrupted file.
function solution(code: string, date: string): Solution {
  return {
    author: "Vitor",
    code,
    language: "typescript",
    status: SolutionStatus.Done,
    cpuUsage: 50,
    memoryUsage: 25,
    date,
  };
}

describe("getSolutions / readSolutionsFile", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeFixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "solutions-repo-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  function writeSolutions(root: string, date: string, data: unknown) {
    const [y = "", m = "", d = ""] = date.split("-");
    fs.mkdirSync(path.join(root, y, m), { recursive: true });
    fs.writeFileSync(
      path.join(root, y, m, `${d}.json`),
      typeof data === "string" ? data : JSON.stringify(data),
    );
  }

  it("reads and sorts solutions descending by date", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", [
      solution("a", "2026-07-20T07:00:00.000Z"),
      solution("b", "2026-07-20T09:00:00.000Z"),
      solution("c", "2026-07-20T08:00:00.000Z"),
    ]);

    const solutions = await getSolutions("2026", "07", "20", root);
    expect(solutions?.map((s) => s.code)).toEqual(["b", "c", "a"]);
  });

  // No file means the day's solutions were never fetched, which callers
  // must be able to tell apart from an empty file recording no submissions.
  it("returns null for a missing file", async () => {
    const root = makeFixture();
    expect(await getSolutions("2026", "07", "20", root)).toBeNull();
  });

  // Optional fields absent from the file stay absent rather than becoming
  // explicit `undefined`s, and unknown keys are dropped.
  it("keeps only the known fields of each solution", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", [
      {
        author: "Vitor",
        code: "a",
        language: "python3",
        date: "2026-07-20T07:00:00.000Z",
        extra: "ignored",
      },
    ]);

    expect(await getSolutions("2026", "07", "20", root)).toStrictEqual([
      {
        author: "Vitor",
        code: "a",
        language: "python3",
        date: "2026-07-20T07:00:00.000Z",
      },
    ]);
  });

  // Well-formed JSON with the wrong shape is as corrupt as malformed JSON:
  // a status outside the enum must not pass for a typed Solution.
  it("throws for a status outside the enum", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", [
      { ...solution("a", "2026-07-20T07:00:00.000Z"), status: "ACCEPTED" },
    ]);
    await expect(getSolutions("2026", "07", "20", root)).rejects.toThrow(
      TypeError,
    );
  });

  // A file holding an object instead of an array is a corrupted archive.
  it("throws when the file does not hold an array", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", {});
    await expect(getSolutions("2026", "07", "20", root)).rejects.toThrow(
      TypeError,
    );
  });

  it("returns an empty array for an empty file", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", []);
    expect(await getSolutions("2026", "07", "20", root)).toEqual([]);
  });

  // "Nothing submitted" is recorded as a valid `[]` file, so a file that
  // fails to parse is a corrupted archive. It must surface (error boundary,
  // failed build) rather than pass for a day with no submissions, which
  // would count it as failed and break the streak.
  it("throws for malformed JSON instead of reporting no submissions", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", "{not json");
    await expect(getSolutions("2026", "07", "20", root)).rejects.toThrow(
      SyntaxError,
    );
  });

  // A read failure other than a missing file (here EISDIR, from a directory
  // sitting at the file path) must be mistaken neither for "not fetched yet"
  // nor for "nothing submitted".
  it("throws when the file path is a directory", async () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "07", "20.json"), { recursive: true });
    await expect(getSolutions("2026", "07", "20", root)).rejects.toMatchObject({
      code: "EISDIR",
    });
  });

  // getSolutions is wrapped in React's cache(), which only memoizes inside a
  // React server render; here (plain Node) every call must hit the disk, so
  // a rewrite between calls is visible.
  it("calls through to the filesystem outside a React server render", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", []);
    expect(await getSolutions("2026", "07", "20", root)).toEqual([]);

    writeSolutions(root, "2026-07-20", [
      solution("a", "2026-07-20T07:00:00.000Z"),
    ]);
    expect(
      (await getSolutions("2026", "07", "20", root))?.map((s) => s.code),
    ).toEqual(["a"]);
  });

  it("returns null for an invalid calendar date", async () => {
    const root = makeFixture();
    expect(await getSolutions("2026", "02", "30", root)).toBeNull();
  });

  it("returns null for malformed date segments", async () => {
    const root = makeFixture();
    expect(await getSolutions("2026", "not-a-month", "20", root)).toBeNull();
  });

  describe("readSolutionsFile", () => {
    it("reads a file by its YYYY-MM-DD day", async () => {
      const root = makeFixture();
      writeSolutions(root, "2026-07-20", [
        solution("a", "2026-07-20T07:00:00.000Z"),
        solution("b", "2026-07-20T09:00:00.000Z"),
      ]);

      expect(
        (await readSolutionsFile("2026-07-20", root))?.map((s) => s.code),
      ).toEqual(["b", "a"]);
    });

    it("returns null for a missing file", async () => {
      const root = makeFixture();
      expect(await readSolutionsFile("2026-07-20", root)).toBeNull();
    });

    // The home list and stats are prerendered from this reader, so a
    // corrupted file has to fail the build loudly rather than quietly
    // marking the day as not attempted.
    it("throws for malformed JSON", async () => {
      const root = makeFixture();
      writeSolutions(root, "2026-07-20", "{not json");
      await expect(readSolutionsFile("2026-07-20", root)).rejects.toThrow(
        SyntaxError,
      );
    });
  });
});
