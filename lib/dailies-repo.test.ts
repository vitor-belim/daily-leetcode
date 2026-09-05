import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getArchiveStats,
  getDailySummariesByMonth,
  paginateByMonth,
} from "./dailies-repo";
import { Difficulty, SolutionStatus, SolveStatus } from "./types";

const TODAY = new Date(Date.UTC(2026, 6, 21));

describe("dailies-repo", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeRoots() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dailies-repo-test-"));
    tmpDirs.push(dir);
    return {
      problems: path.join(dir, "problems"),
      solutions: path.join(dir, "solutions"),
    };
  }

  function writeJson(root: string, date: string, data: unknown) {
    const [y = "", m = "", d = ""] = date.split("-");
    fs.mkdirSync(path.join(root, y, m), { recursive: true });
    fs.writeFileSync(
      path.join(root, y, m, `${d}.json`),
      typeof data === "string" ? data : JSON.stringify(data),
    );
  }

  function writeProblem(
    root: string,
    date: string,
    difficulty: Difficulty = Difficulty.Easy,
  ) {
    writeJson(root, date, {
      title: `Problem ${date}`,
      difficulty,
      description: "",
      link: `https://leetcode.com/problems/${date}/`,
      date,
    });
  }

  function solution(author: string, status: SolutionStatus, cpu = 50) {
    return {
      author,
      code: `${author}-${status}-${cpu}`,
      language: "javascript",
      status,
      cpuUsage: cpu,
      memoryUsage: 10,
      date: "2026-07-20T08:00:00.000Z",
    };
  }

  describe("paginateByMonth", () => {
    const dates = [
      "2026-04-30",
      "2026-05-01",
      "2026-05-15",
      "2026-07-02",
      "2026-07-20",
    ];

    it("starts the first page at today's month and covers N calendar months", () => {
      // Today is 2026-07-21: July, June (empty) and May are covered; April is not.
      const page = paginateByMonth(dates, 3, null, TODAY);
      expect(page.dates).toEqual([
        "2026-07-20",
        "2026-07-02",
        "2026-05-15",
        "2026-05-01",
      ]);
      expect(page.total).toBe(5);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBe("2026-05");
    });

    it("continues from the newest archived month older than the cursor", () => {
      // June holds nothing, so paging from before July lands on May directly.
      // The cursor names the oldest month served, as an exclusive bound.
      const page = paginateByMonth(dates, 1, "2026-07", TODAY);
      expect(page.dates).toEqual(["2026-05-15", "2026-05-01"]);
      expect(page.nextCursor).toBe("2026-05");
    });

    it("ends with a null cursor once the oldest month is served", () => {
      const page = paginateByMonth(dates, 1, "2026-05", TODAY);
      expect(page.dates).toEqual(["2026-04-30"]);
      expect(page.hasMore).toBe(false);
      expect(page.nextCursor).toBeNull();
    });

    it("serves nothing when the cursor is already past the oldest month", () => {
      expect(paginateByMonth(dates, 1, "2026-04", TODAY)).toEqual({
        dates: [],
        total: 5,
        hasMore: false,
        nextCursor: null,
      });
    });

    it("handles an empty archive", () => {
      expect(paginateByMonth([], 3, null, TODAY)).toEqual({
        dates: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      });
    });
  });

  describe("getDailySummariesByMonth", () => {
    it("returns the newest days first, merged with their solve summary", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-19");
      writeProblem(roots.problems, "2026-07-20", Difficulty.Hard);
      writeJson(roots.solutions, "2026-07-20", [
        solution("Vitor", SolutionStatus.TimeLimitExceeded),
        solution("Vitor", SolutionStatus.Done, 80),
        solution("Leetcode", SolutionStatus.Done, 99),
      ]);

      const result = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.dailies.map((d) => d.date)).toEqual([
        "2026-07-20",
        "2026-07-19",
      ]);

      const [latest, previous] = result.dailies;
      expect(latest).toMatchObject({
        title: "Problem 2026-07-20",
        difficulty: Difficulty.Hard,
        solveStatus: SolveStatus.Solved,
        attempts: 2,
        bestRuntime: 80,
        hasEditorial: true,
      });
      // No solutions file at all for a past day reads as never attempted.
      expect(previous).toMatchObject({
        solveStatus: SolveStatus.Unsolved,
        attempts: 0,
        hasEditorial: false,
      });
    });

    it("pages month by month and drops days with unreadable problems", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-06-19");
      writeJson(roots.problems, "2026-07-20", "{not json");
      writeProblem(roots.problems, "2026-07-21");

      const first = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(first.dailies.map((d) => d.date)).toEqual(["2026-07-21"]);
      expect(first.hasMore).toBe(true);
      expect(first.nextCursor).toBe("2026-07");

      const second = await getDailySummariesByMonth(
        1,
        first.nextCursor,
        roots,
        TODAY,
      );
      expect(second.dailies.map((d) => d.date)).toEqual(["2026-06-19"]);
      expect(second.hasMore).toBe(false);
    });

    it("marks today as pending until something is submitted", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-21");

      const result = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(result.dailies[0]?.solveStatus).toBe(SolveStatus.Pending);
    });
  });

  describe("getArchiveStats", () => {
    it("aggregates every archived day", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-18", Difficulty.Medium);
      writeProblem(roots.problems, "2026-07-19", Difficulty.Easy);
      writeProblem(roots.problems, "2026-07-20", Difficulty.Hard);
      writeProblem(roots.problems, "2026-07-21", Difficulty.Easy);
      writeJson(roots.solutions, "2026-07-18", [
        solution("Vitor", SolutionStatus.Failed),
      ]);
      writeJson(roots.solutions, "2026-07-19", [
        solution("Vitor", SolutionStatus.Done),
      ]);
      writeJson(roots.solutions, "2026-07-20", [
        solution("Vitor", SolutionStatus.Done),
      ]);

      const stats = await getArchiveStats(roots, TODAY);
      expect(stats).toEqual({
        totalDays: 4,
        solved: 2,
        failed: 1,
        unsolved: 0,
        pending: 1,
        byDifficulty: {
          [Difficulty.Easy]: { total: 2, solved: 1 },
          [Difficulty.Medium]: { total: 1, solved: 0 },
          [Difficulty.Hard]: { total: 1, solved: 1 },
        },
        currentStreak: 2,
        longestStreak: 2,
      });
    });

    it("returns zeroed stats for an empty archive", async () => {
      const roots = makeRoots();
      const stats = await getArchiveStats(roots, TODAY);
      expect(stats.totalDays).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
    });
  });
});
