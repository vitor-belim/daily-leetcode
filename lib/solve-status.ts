import { formatDateUTC, isPastDateUTC, shiftDateUTC, todayUTC } from "./dates";
import {
  Difficulty,
  SolutionStatus,
  SolveStatus,
  type ArchiveStats,
  type DifficultyStats,
  type Solution,
  type SolveSummary,
} from "./types";

/**
 * The `author` value used for solutions copied from LeetCode's editorial
 * rather than written by the site's author.
 */
export const EDITORIAL_AUTHOR = "Leetcode";

/**
 * Tells whether a solution was submitted by the site's author. Every author
 * other than the editorial one counts, including collaborative variants like
 * "Vitor + Claude", since those were still the author's own submissions.
 *
 * @param solution The solution to classify.
 * @returns True unless the solution is an editorial copy.
 */
export function isOwnSolution(solution: Solution): boolean {
  return solution.author !== EDITORIAL_AUTHOR;
}

/**
 * Picks the higher of a running best and a candidate percentile, treating a
 * missing candidate as no improvement.
 *
 * @param best The best percentile so far, or null when none was seen yet.
 * @param candidate The percentile to consider, possibly undefined.
 * @returns The new best; null only when both inputs were absent.
 */
function maxPercentile(
  best: number | null,
  candidate: number | undefined,
): number | null {
  if (candidate === undefined) return best;
  return best === null ? candidate : Math.max(best, candidate);
}

/**
 * Derives the author's progress on one day from its archived solutions.
 *
 * @param solutions The day's solutions, in any order.
 * @param date The challenge day as `YYYY-MM-DD`, used to tell an unsolved
 *   past day from one that is still in progress.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The solve status plus attempt count, languages, best accepted
 *   percentiles and whether an editorial solution is present.
 */
export function summarizeSolutions(
  solutions: Solution[],
  date: string,
  today: Date = todayUTC(),
): SolveSummary {
  const own = solutions.filter(isOwnSolution);
  const accepted = own.filter((s) => s.status === SolutionStatus.Done);

  let bestRuntime: number | null = null;
  let bestMemory: number | null = null;
  for (const solution of accepted) {
    bestRuntime = maxPercentile(bestRuntime, solution.cpuUsage);
    bestMemory = maxPercentile(bestMemory, solution.memoryUsage);
  }

  return {
    solveStatus: resolveStatus(own.length, accepted.length, date, today),
    attempts: own.length,
    languages: [...new Set(own.map((s) => s.language))],
    bestRuntime,
    bestMemory,
    hasEditorial: own.length < solutions.length,
  };
}

/**
 * Maps attempt and acceptance counts to a `SolveStatus`.
 *
 * @param attempts Number of the author's own submissions.
 * @param accepted Number of those that were accepted.
 * @param date The challenge day as `YYYY-MM-DD`.
 * @param today The reference "today".
 * @returns Solved when anything was accepted, Failed when only rejected
 *   attempts exist, otherwise Unsolved for a finished day and Pending for
 *   one still in progress.
 */
function resolveStatus(
  attempts: number,
  accepted: number,
  date: string,
  today: Date,
): SolveStatus {
  if (accepted > 0) return SolveStatus.Solved;
  if (attempts > 0) return SolveStatus.Failed;
  return isPastDateUTC(date, today)
    ? SolveStatus.Unsolved
    : SolveStatus.Pending;
}

/** The per-day inputs `computeArchiveStats` aggregates. */
export interface DayOutcome {
  date: string;
  difficulty: Difficulty;
  solveStatus: SolveStatus;
}

/**
 * Counts the longest run of consecutive solved calendar days. Days missing
 * from the archive break a run just like unsolved ones do.
 *
 * @param solvedDates The solved days as `YYYY-MM-DD`, in any order.
 * @returns The length of the longest run; zero when nothing was solved.
 */
export function longestSolvedStreak(solvedDates: Iterable<string>): number {
  const solved = new Set(solvedDates);
  let longest = 0;

  for (const date of solved) {
    if (solved.has(shiftDateUTC(date, -1))) continue;

    let length = 0;
    let cursor = date;
    while (solved.has(cursor)) {
      length += 1;
      cursor = shiftDateUTC(cursor, 1);
    }
    longest = Math.max(longest, length);
  }

  return longest;
}

/**
 * Counts the consecutive solved calendar days ending at today. A today that
 * is still pending is skipped rather than breaking the streak, so the count
 * doesn't drop to zero every morning before the day is solved.
 *
 * @param statusByDate Each archived day's solve status, keyed by
 *   `YYYY-MM-DD`.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The current streak length; zero when the most recent finished
 *   day was not solved.
 */
export function currentSolvedStreak(
  statusByDate: ReadonlyMap<string, SolveStatus>,
  today: Date = todayUTC(),
): number {
  let cursor = formatDateUTC(today);
  if (statusByDate.get(cursor) === SolveStatus.Pending) {
    cursor = shiftDateUTC(cursor, -1);
  }

  let streak = 0;
  while (statusByDate.get(cursor) === SolveStatus.Solved) {
    streak += 1;
    cursor = shiftDateUTC(cursor, -1);
  }

  return streak;
}

/**
 * Builds an empty per-difficulty tally.
 *
 * @returns Zeroed `DifficultyStats` for every `Difficulty`.
 */
function emptyDifficultyStats(): Record<Difficulty, DifficultyStats> {
  return {
    [Difficulty.Easy]: { total: 0, solved: 0 },
    [Difficulty.Medium]: { total: 0, solved: 0 },
    [Difficulty.Hard]: { total: 0, solved: 0 },
  };
}

/**
 * Aggregates per-day outcomes into archive-wide totals, per-difficulty
 * counts and streaks.
 *
 * @param outcomes One entry per archived day.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The archive statistics.
 */
export function computeArchiveStats(
  outcomes: DayOutcome[],
  today: Date = todayUTC(),
): ArchiveStats {
  const byDifficulty = emptyDifficultyStats();
  const statusByDate = new Map<string, SolveStatus>();
  const counts: Record<SolveStatus, number> = {
    [SolveStatus.Solved]: 0,
    [SolveStatus.Failed]: 0,
    [SolveStatus.Unsolved]: 0,
    [SolveStatus.Pending]: 0,
  };

  for (const { date, difficulty, solveStatus } of outcomes) {
    statusByDate.set(date, solveStatus);
    counts[solveStatus] += 1;
    const tier = byDifficulty[difficulty];
    tier.total += 1;
    if (solveStatus === SolveStatus.Solved) tier.solved += 1;
  }

  const solvedDates = outcomes
    .filter((o) => o.solveStatus === SolveStatus.Solved)
    .map((o) => o.date);

  return {
    totalDays: outcomes.length,
    solved: counts[SolveStatus.Solved],
    failed: counts[SolveStatus.Failed],
    unsolved: counts[SolveStatus.Unsolved],
    pending: counts[SolveStatus.Pending],
    byDifficulty,
    currentStreak: currentSolvedStreak(statusByDate, today),
    longestStreak: longestSolvedStreak(solvedDates),
  };
}
