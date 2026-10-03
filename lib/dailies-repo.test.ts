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
        attemptsToSolve: 2,
        bestRuntime: 80,
        hasEditorial: true,
      });
      // No solutions file at all for a past day means its submissions were
      // never fetched, so it is still waiting for a submission.
      expect(previous).toMatchObject({
        solveStatus: SolveStatus.Pending,
        attempts: 0,
        hasEditorial: false,
      });
    });

    // An empty file is what fetch-solution writes once a day ends with no
    // submissions, so unlike a missing file it records a day not attempted.
    it("reads an empty solutions file for a past day as not attempted", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-19");
      writeJson(roots.solutions, "2026-07-19", []);

      const result = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(result.dailies[0]).toMatchObject({
        solveStatus: SolveStatus.Failed,
        attempts: 0,
      });
    });

    // Summaries cross the server/client boundary (home page prop and the
    // dailies route JSON), so they must not carry fields the list never
    // renders, like the problem link or the memory percentile.
    it("leaves fields the home list never renders out of each summary", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-20");
      writeJson(roots.solutions, "2026-07-20", [
        solution("Vitor", SolutionStatus.Done, 80),
      ]);

      const result = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(result.dailies).toEqual([
        {
          date: "2026-07-20",
          title: "Problem 2026-07-20",
          difficulty: Difficulty.Easy,
          solveStatus: SolveStatus.Solved,
          attempts: 1,
          attemptsToSolve: 1,
          languages: ["javascript"],
          bestRuntime: 80,
          hasEditorial: false,
        },
      ]);
    });

    it("pages month by month", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-06-19");
      writeProblem(roots.problems, "2026-07-20");
      writeProblem(roots.problems, "2026-07-21");

      const first = await getDailySummariesByMonth(1, null, roots, TODAY);
      expect(first.dailies.map((d) => d.date)).toEqual([
        "2026-07-21",
        "2026-07-20",
      ]);
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

    // The list is prerendered at build time, so a corrupted problem or
    // solutions file must fail the build loudly instead of silently dropping
    // the day or reporting it as not attempted.
    it("throws on a malformed problem file", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-19");
      writeJson(roots.problems, "2026-07-20", "{not json");

      await expect(
        getDailySummariesByMonth(1, null, roots, TODAY),
      ).rejects.toThrow(SyntaxError);
    });

    it("throws on a malformed solutions file", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-20");
      writeJson(roots.solutions, "2026-07-20", "{not json");

      await expect(
        getDailySummariesByMonth(1, null, roots, TODAY),
      ).rejects.toThrow(SyntaxError);
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
        functionallyCorrect: 0,
        failed: 1,
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

    // Days whose solutions haven't been fetched yet are pending rather than
    // failed: they stay out of the solved percentage and don't break the
    // streak built before them.
    it("counts days without a solutions file as pending", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-18");
      writeProblem(roots.problems, "2026-07-19");
      writeProblem(roots.problems, "2026-07-20");
      writeProblem(roots.problems, "2026-07-21");
      writeJson(roots.solutions, "2026-07-18", [
        solution("Vitor", SolutionStatus.Done),
      ]);
      writeJson(roots.solutions, "2026-07-19", [
        solution("Vitor", SolutionStatus.Done),
      ]);

      const stats = await getArchiveStats(roots, TODAY);
      expect(stats).toMatchObject({
        totalDays: 4,
        solved: 2,
        failed: 0,
        pending: 2,
        currentStreak: 2,
        longestStreak: 2,
      });
    });

    // Stats are prerendered too: a corrupted solutions file would otherwise
    // count the day as failed and break the streak without any signal.
    it("throws on a malformed solutions file", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-20");
      writeJson(roots.solutions, "2026-07-20", "{not json");

      await expect(getArchiveStats(roots, TODAY)).rejects.toThrow(SyntaxError);
    });

    // Well-formed JSON of the wrong shape is just as corrupt: an object
    // instead of the solutions array must not count as "not attempted".
    it("throws on a solutions file holding the wrong shape", async () => {
      const roots = makeRoots();
      writeProblem(roots.problems, "2026-07-20");
      writeJson(roots.solutions, "2026-07-20", {});

      await expect(getArchiveStats(roots, TODAY)).rejects.toThrow(TypeError);
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
