import { describe, it, expect } from "vitest";
import {
  computeArchiveStats,
  currentSolvedStreak,
  isOwnSolution,
  longestSolvedStreak,
  summarizeSolutions,
} from "./solve-status";
import {
  Difficulty,
  SolutionStatus,
  SolveStatus,
  type Solution,
} from "./types";

const TODAY = new Date(Date.UTC(2026, 6, 21));

function solution(overrides: Partial<Solution>): Solution {
  return {
    author: "Vitor",
    code: "",
    language: "javascript",
    date: "2026-07-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("isOwnSolution", () => {
  it("treats every non-editorial author as the site's author", () => {
    expect(isOwnSolution(solution({ author: "Vitor" }))).toBe(true);
    expect(isOwnSolution(solution({ author: "Vitor + Claude" }))).toBe(true);
    expect(isOwnSolution(solution({ author: "Leetcode" }))).toBe(false);
  });
});

describe("summarizeSolutions", () => {
  it("is solved when any own submission was accepted", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.TimeLimitExceeded, cpuUsage: 0 }),
        solution({
          status: SolutionStatus.Done,
          cpuUsage: 20,
          memoryUsage: 90,
        }),
        solution({
          status: SolutionStatus.Done,
          cpuUsage: 85,
          memoryUsage: 40,
          language: "python",
        }),
      ],
      "2026-07-20",
      TODAY,
    );

    expect(summary).toEqual({
      solveStatus: SolveStatus.Solved,
      attempts: 3,
      languages: ["javascript", "python"],
      // Best percentiles are taken independently across accepted submissions.
      bestRuntime: 85,
      bestMemory: 90,
      hasEditorial: false,
    });
  });

  it("ignores editorial solutions when deciding the status", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.TimeLimitExceeded }),
        solution({
          author: "Leetcode",
          status: SolutionStatus.Done,
          cpuUsage: 99,
        }),
      ],
      "2026-07-20",
      TODAY,
    );

    expect(summary.solveStatus).toBe(SolveStatus.Failed);
    expect(summary.attempts).toBe(1);
    expect(summary.bestRuntime).toBeNull();
    expect(summary.hasEditorial).toBe(true);
  });

  it("distinguishes a finished unsolved day from one still in progress", () => {
    expect(summarizeSolutions([], "2026-07-20", TODAY).solveStatus).toBe(
      SolveStatus.Unsolved,
    );
    expect(summarizeSolutions([], "2026-07-21", TODAY).solveStatus).toBe(
      SolveStatus.Pending,
    );
  });

  it("counts an editorial-only day as unsolved", () => {
    const summary = summarizeSolutions(
      [solution({ author: "Leetcode", status: SolutionStatus.Done })],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.Unsolved);
    expect(summary.hasEditorial).toBe(true);
  });
});

describe("longestSolvedStreak", () => {
  it("finds the longest run of consecutive calendar days", () => {
    expect(
      longestSolvedStreak([
        "2026-07-01",
        "2026-07-02",
        "2026-07-04",
        "2026-07-05",
        "2026-07-06",
        "2026-07-10",
      ]),
    ).toBe(3);
  });

  it("spans month boundaries", () => {
    expect(longestSolvedStreak(["2026-06-30", "2026-07-01"])).toBe(2);
  });

  it("is zero for no solved days", () => {
    expect(longestSolvedStreak([])).toBe(0);
  });
});

describe("currentSolvedStreak", () => {
  it("counts back from today while days are solved", () => {
    const statuses = new Map([
      ["2026-07-18", SolveStatus.Failed],
      ["2026-07-19", SolveStatus.Solved],
      ["2026-07-20", SolveStatus.Solved],
      ["2026-07-21", SolveStatus.Solved],
    ]);
    expect(currentSolvedStreak(statuses, TODAY)).toBe(3);
  });

  it("skips a pending today instead of breaking the streak", () => {
    const statuses = new Map([
      ["2026-07-20", SolveStatus.Solved],
      ["2026-07-21", SolveStatus.Pending],
    ]);
    expect(currentSolvedStreak(statuses, TODAY)).toBe(1);
  });

  it("is zero when yesterday was failed and today is pending", () => {
    const statuses = new Map([
      ["2026-07-19", SolveStatus.Solved],
      ["2026-07-20", SolveStatus.Failed],
      ["2026-07-21", SolveStatus.Pending],
    ]);
    expect(currentSolvedStreak(statuses, TODAY)).toBe(0);
  });

  it("is zero when today is missing from the archive", () => {
    const statuses = new Map([["2026-07-20", SolveStatus.Solved]]);
    expect(currentSolvedStreak(statuses, TODAY)).toBe(0);
  });
});

describe("computeArchiveStats", () => {
  it("tallies statuses per difficulty and computes streaks", () => {
    const stats = computeArchiveStats(
      [
        {
          date: "2026-07-17",
          difficulty: Difficulty.Easy,
          solveStatus: SolveStatus.Unsolved,
        },
        {
          date: "2026-07-18",
          difficulty: Difficulty.Medium,
          solveStatus: SolveStatus.Solved,
        },
        {
          date: "2026-07-19",
          difficulty: Difficulty.Medium,
          solveStatus: SolveStatus.Failed,
        },
        {
          date: "2026-07-20",
          difficulty: Difficulty.Hard,
          solveStatus: SolveStatus.Solved,
        },
        {
          date: "2026-07-21",
          difficulty: Difficulty.Easy,
          solveStatus: SolveStatus.Pending,
        },
      ],
      TODAY,
    );

    expect(stats).toEqual({
      totalDays: 5,
      solved: 2,
      failed: 1,
      unsolved: 1,
      pending: 1,
      byDifficulty: {
        [Difficulty.Easy]: { total: 2, solved: 0 },
        [Difficulty.Medium]: { total: 2, solved: 1 },
        [Difficulty.Hard]: { total: 1, solved: 1 },
      },
      currentStreak: 1,
      longestStreak: 1,
    });
  });
});
