import { describe, it, expect } from "vitest";
import {
  computeArchiveStats,
  currentStreak,
  isOwnSolution,
  longestStreak,
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
      // The TLE came first, so the pass took two tries; the later accepted
      // python run doesn't add to that.
      attemptsToSolve: 2,
      languages: ["javascript", "python"],
      // Best percentiles are taken independently across accepted submissions.
      bestRuntime: 85,
      bestMemory: 90,
      hasEditorial: false,
    });
  });

  // Submissions made after the first pass (other approaches, chasing better
  // percentiles) don't count towards the tries it took, and the file order
  // is irrelevant: only submission time decides which pass came first.
  it("counts attempts up to the earliest accepted submission", () => {
    const summary = summarizeSolutions(
      [
        solution({
          status: SolutionStatus.Done,
          date: "2026-07-20T09:30:00.000Z",
        }),
        solution({
          status: SolutionStatus.Failed,
          date: "2026-07-20T09:10:00.000Z",
        }),
        solution({
          status: SolutionStatus.Failed,
          date: "2026-07-20T09:40:00.000Z",
        }),
        solution({
          status: SolutionStatus.Done,
          date: "2026-07-20T09:20:00.000Z",
        }),
      ],
      "2026-07-20",
      TODAY,
    );

    expect(summary.attempts).toBe(4);
    expect(summary.attemptsToSolve).toBe(2);
  });

  // Submissions for the same problem from before it became the daily, or
  // after its UTC day ended, don't count towards the challenge day's tries.
  it("counts only submissions made on the challenge's UTC day", () => {
    const summary = summarizeSolutions(
      [
        solution({
          status: SolutionStatus.Done,
          date: "2024-09-13T14:37:19.000Z",
        }),
        solution({
          status: SolutionStatus.Failed,
          date: "2026-07-20T00:05:00.000Z",
        }),
        solution({
          status: SolutionStatus.Done,
          date: "2026-07-20T23:55:00.000Z",
        }),
        solution({
          status: SolutionStatus.Done,
          date: "2026-07-21T00:05:00.000Z",
        }),
      ],
      "2026-07-20",
      TODAY,
    );

    expect(summary.attempts).toBe(4);
    expect(summary.attemptsToSolve).toBe(2);
  });

  // The day still reads as solved thanks to the older pass, but it has no
  // challenge-day count to report.
  it("has no attempts-to-solve when the only pass came on another day", () => {
    const summary = summarizeSolutions(
      [
        solution({
          status: SolutionStatus.Done,
          date: "2024-07-27T07:23:57.000Z",
        }),
        solution({
          status: SolutionStatus.Failed,
          date: "2026-07-20T08:00:00.000Z",
        }),
      ],
      "2026-07-20",
      TODAY,
    );

    expect(summary.solveStatus).toBe(SolveStatus.Solved);
    expect(summary.attemptsToSolve).toBeNull();
  });

  it("has no attempts-to-solve when nothing was accepted", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.Failed }),
        solution({ status: SolutionStatus.TimeLimitExceeded }),
      ],
      "2026-07-20",
      TODAY,
    );
    expect(summary.attemptsToSolve).toBeNull();
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

    // The author's own best outcome is a TLE, so the day is functionally
    // correct even though the editorial one was accepted.
    expect(summary.solveStatus).toBe(SolveStatus.FunctionallyCorrect);
    expect(summary.attempts).toBe(1);
    expect(summary.bestRuntime).toBeNull();
    expect(summary.hasEditorial).toBe(true);
  });

  // A time limit exceeded means the approach worked but was too slow, which
  // never counts as a failure.
  it("is functionally correct when a rejected day includes a TLE", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.Failed }),
        solution({ status: SolutionStatus.TimeLimitExceeded }),
      ],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.FunctionallyCorrect);
  });

  // A memory limit exceeded is the same kind of "worked but cost too much"
  // outcome as a time limit exceeded.
  it("is functionally correct when a rejected day includes an MLE", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.Failed }),
        solution({ status: SolutionStatus.MemoryLimitExceeded }),
      ],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.FunctionallyCorrect);
  });

  // A failed-constraints submission hit a runtime limit LeetCode doesn't
  // report as TLE/MLE (e.g. "RangeError: Invalid string length", heap out of
  // memory), so it's another "worked but cost too much" outcome.
  it("is functionally correct when a rejected day includes a failed-constraints run", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.Failed }),
        solution({ status: SolutionStatus.FailedConstraints }),
      ],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.FunctionallyCorrect);
  });

  it("fails a day whose attempts only errored out", () => {
    const summary = summarizeSolutions(
      [
        solution({ status: SolutionStatus.Failed }),
        solution({ status: SolutionStatus.Failed }),
      ],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.Failed);
  });

  // A never-attempted past day counts as failed too; only a day still in
  // progress is held back as pending.
  it("distinguishes a finished untouched day from one still in progress", () => {
    expect(summarizeSolutions([], "2026-07-20", TODAY).solveStatus).toBe(
      SolveStatus.Failed,
    );
    expect(summarizeSolutions([], "2026-07-21", TODAY).solveStatus).toBe(
      SolveStatus.Pending,
    );
  });

  it("counts an editorial-only day as failed", () => {
    const summary = summarizeSolutions(
      [solution({ author: "Leetcode", status: SolutionStatus.Done })],
      "2026-07-20",
      TODAY,
    );
    expect(summary.solveStatus).toBe(SolveStatus.Failed);
    expect(summary.hasEditorial).toBe(true);
  });
});

describe("longestStreak", () => {
  it("finds the longest run of consecutive calendar days", () => {
    expect(
      longestStreak([
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
    expect(longestStreak(["2026-06-30", "2026-07-01"])).toBe(2);
  });

  it("is zero for no solved days", () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe("currentStreak", () => {
  it("counts back from today while days are solved", () => {
    const statuses = new Map([
      ["2026-07-18", SolveStatus.Failed],
      ["2026-07-19", SolveStatus.Solved],
      ["2026-07-20", SolveStatus.Solved],
      ["2026-07-21", SolveStatus.Solved],
    ]);
    expect(currentStreak(statuses, TODAY)).toBe(3);
  });

  it("skips a pending today instead of breaking the streak", () => {
    const statuses = new Map([
      ["2026-07-20", SolveStatus.Solved],
      ["2026-07-21", SolveStatus.Pending],
    ]);
    expect(currentStreak(statuses, TODAY)).toBe(1);
  });

  it("is zero when yesterday was failed and today is pending", () => {
    const statuses = new Map([
      ["2026-07-19", SolveStatus.Solved],
      ["2026-07-20", SolveStatus.Failed],
      ["2026-07-21", SolveStatus.Pending],
    ]);
    expect(currentStreak(statuses, TODAY)).toBe(0);
  });

  it("is zero when today is missing from the archive", () => {
    const statuses = new Map([["2026-07-20", SolveStatus.Solved]]);
    expect(currentStreak(statuses, TODAY)).toBe(0);
  });

  // Only a failed or never attempted day breaks a streak; a day that was
  // merely too slow keeps it running.
  it("counts through a functionally correct day", () => {
    const statuses = new Map([
      ["2026-07-19", SolveStatus.Solved],
      ["2026-07-20", SolveStatus.FunctionallyCorrect],
      ["2026-07-21", SolveStatus.Solved],
    ]);
    expect(currentStreak(statuses, TODAY)).toBe(3);
  });
});

describe("computeArchiveStats", () => {
  it("tallies statuses per difficulty and computes streaks", () => {
    const stats = computeArchiveStats(
      [
        {
          date: "2026-07-17",
          difficulty: Difficulty.Easy,
          solveStatus: SolveStatus.FunctionallyCorrect,
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
      functionallyCorrect: 1,
      failed: 1,
      pending: 1,
      byDifficulty: {
        [Difficulty.Easy]: { total: 2, solved: 0 },
        [Difficulty.Medium]: { total: 2, solved: 1 },
        [Difficulty.Hard]: { total: 1, solved: 1 },
      },
      currentStreak: 1,
      // 07-17 was functionally correct and 07-18 solved: a two-day run.
      longestStreak: 2,
    });
  });
});
