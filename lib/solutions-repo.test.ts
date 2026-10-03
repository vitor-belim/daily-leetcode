import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getSolutions } from "./solutions-repo";

describe("getSolutions", () => {
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
      { code: "a", date: "2026-07-20T07:00:00.000Z" },
      { code: "b", date: "2026-07-20T09:00:00.000Z" },
      { code: "c", date: "2026-07-20T08:00:00.000Z" },
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

  it("returns an empty array for an empty file", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", []);
    expect(await getSolutions("2026", "07", "20", root)).toEqual([]);
  });

  it("returns an empty array for malformed JSON", async () => {
    const root = makeFixture();
    writeSolutions(root, "2026-07-20", "{not json");
    expect(await getSolutions("2026", "07", "20", root)).toEqual([]);
  });

  // A read failure other than a missing file (here EISDIR, from a directory
  // sitting at the file path) must not be mistaken for "not fetched yet".
  it("returns an empty array when the file path is a directory", async () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "07", "20.json"), { recursive: true });
    expect(await getSolutions("2026", "07", "20", root)).toEqual([]);
  });

  it("returns null for an invalid calendar date", async () => {
    const root = makeFixture();
    expect(await getSolutions("2026", "02", "30", root)).toBeNull();
  });

  it("returns null for malformed date segments", async () => {
    const root = makeFixture();
    expect(await getSolutions("2026", "not-a-month", "20", root)).toBeNull();
  });
});
