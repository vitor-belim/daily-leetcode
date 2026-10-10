import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  collectFilledDates,
  getMissingDates,
  listArchivedDayParams,
  listMissingDates,
  listMonthCursors,
} from "./archive";

describe("collectFilledDates", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeFixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archive-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  it("returns an empty array when the root doesn't exist", () => {
    expect(
      collectFilledDates(path.join(os.tmpdir(), "does-not-exist")),
    ).toEqual([]);
  });

  it("collects valid dates and ignores a stray non-date file", () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "07"), { recursive: true });
    fs.writeFileSync(path.join(root, "2026", "07", "20.json"), "{}");
    fs.writeFileSync(path.join(root, "2026", "07", "22.json"), "{}");
    // Stray file that should NOT be treated as a valid day.
    fs.writeFileSync(path.join(root, "2026", "07", "notes.json"), "{}");

    expect(collectFilledDates(root)).toEqual(["2026-07-20", "2026-07-22"]);
  });

  it("rejects a filename that looks like a date but isn't a real calendar date", () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "02"), { recursive: true });
    fs.writeFileSync(path.join(root, "2026", "02", "30.json"), "{}"); // Feb 30 doesn't exist.
    fs.writeFileSync(path.join(root, "2026", "02", "15.json"), "{}");

    expect(collectFilledDates(root)).toEqual(["2026-02-15"]);
  });

  it("doesn't break when the newest month/year directory is empty", () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "2026", "07"), { recursive: true });
    fs.writeFileSync(path.join(root, "2026", "07", "20.json"), "{}");
    fs.mkdirSync(path.join(root, "2026", "08"), { recursive: true });

    expect(collectFilledDates(root)).toEqual(["2026-07-20"]);
  });
});

describe("getMissingDates", () => {
  it("returns an empty array when every day in range is filled", () => {
    const filled = ["2026-07-20", "2026-07-21", "2026-07-22"];
    const today = new Date(Date.UTC(2026, 6, 22));
    expect(getMissingDates(filled, today)).toEqual([]);
  });

  it("detects an interior gap, not just tail days", () => {
    const filled = ["2026-07-20", "2026-07-22", "2026-07-25"];
    const today = new Date(Date.UTC(2026, 6, 26));
    expect(getMissingDates(filled, today)).toEqual([
      "2026-07-21", // interior gap
      "2026-07-23",
      "2026-07-24",
      "2026-07-26", // tail
    ]);
  });

  it("includes today when today itself is missing", () => {
    const filled = ["2026-07-20"];
    const today = new Date(Date.UTC(2026, 6, 20));
    expect(getMissingDates(filled, today)).toEqual([]);
  });

  it("returns an empty array for an empty input (no range to scan)", () => {
    expect(getMissingDates([], new Date(Date.UTC(2026, 6, 22)))).toEqual([]);
  });
});

describe("getMissingDates with an explicit start", () => {
  it("scans from the given day even when it predates the archive", () => {
    const today = new Date(Date.UTC(2026, 0, 6));
    expect(
      getMissingDates(["2026-01-04", "2026-01-05"], today, "2026-01-01"),
    ).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-06"]);
  });

  it("works on an empty archive when a start is given", () => {
    const today = new Date(Date.UTC(2026, 0, 2));
    expect(getMissingDates([], today, "2026-01-01")).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
  });
});

describe("archive route helpers", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeArchive(dates: string[]): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "archive-routes-test-"));
    tmpDirs.push(root);
    for (const date of dates) {
      const [year = "", month = "", day = ""] = date.split("-");
      fs.mkdirSync(path.join(root, year, month), { recursive: true });
      fs.writeFileSync(path.join(root, year, month, `${day}.json`), "{}");
    }
    return root;
  }

  it("splits every archived day into blog route segments", () => {
    const root = makeArchive(["2026-07-20", "2026-08-01"]);

    expect(listArchivedDayParams(root)).toEqual([
      { year: "2026", month: "07", day: "20" },
      { year: "2026", month: "08", day: "01" },
    ]);
  });

  it("returns no route segments for a missing archive", () => {
    expect(
      listArchivedDayParams(path.join(os.tmpdir(), "does-not-exist")),
    ).toEqual([]);
  });

  it("lists every calendar month from the oldest archived one through today, gaps included", () => {
    // 2026-12 and 2027-01 hold no data but are still valid cursors, and the
    // range crosses a year boundary.
    const root = makeArchive(["2026-11-30", "2027-02-01"]);

    expect(listMonthCursors(root, new Date(Date.UTC(2027, 2, 15)))).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });

  it("returns no month cursors for an empty archive", () => {
    expect(
      listMonthCursors(makeArchive([]), new Date(Date.UTC(2026, 0, 1))),
    ).toEqual([]);
  });
});

describe("listMissingDates", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeArchive(dates: string[]): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "archive-missing-test-"));
    tmpDirs.push(root);
    for (const date of dates) {
      const [year = "", month = "", day = ""] = date.split("-");
      fs.mkdirSync(path.join(root, year, month), { recursive: true });
      fs.writeFileSync(path.join(root, year, month, `${day}.json`), "{}");
    }
    return root;
  }

  it("returns nothing when the archive is complete through today", () => {
    const root = makeArchive(["2026-10-08", "2026-10-09", "2026-10-10"]);

    expect(listMissingDates(root, new Date(Date.UTC(2026, 9, 10)))).toEqual(
      [],
    );
  });

  it("catches up on every day skipped since the last run, today included", () => {
    // The scheduled run last succeeded on 10-07; the machine was off for the
    // next two runs, so 10-08, 10-09 and today all need fetching.
    const root = makeArchive(["2026-10-06", "2026-10-07"]);

    expect(listMissingDates(root, new Date(Date.UTC(2026, 9, 10)))).toEqual([
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("includes interior gaps, across a month boundary", () => {
    const root = makeArchive(["2026-09-29", "2026-10-02"]);

    expect(listMissingDates(root, new Date(Date.UTC(2026, 9, 2)))).toEqual([
      "2026-09-30",
      "2026-10-01",
    ]);
  });

  it("seeds today alone on an empty archive", () => {
    expect(
      listMissingDates(makeArchive([]), new Date(Date.UTC(2026, 9, 10))),
    ).toEqual(["2026-10-10"]);
  });

  it("seeds today alone when the archive root doesn't exist", () => {
    expect(
      listMissingDates(
        path.join(os.tmpdir(), "does-not-exist"),
        new Date(Date.UTC(2026, 9, 10)),
      ),
    ).toEqual(["2026-10-10"]);
  });
});
