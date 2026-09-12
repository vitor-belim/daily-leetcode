import { formatDateUTC, isPastDateUTC, shiftDateUTC, todayUTC } from "./dates";
import {
  type ArchiveStats,
  Difficulty,
  type DifficultyStats,
  type Solution,
  SolutionStatus,
  SolveStatus,
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
 * Counts how many submissions it took to first get accepted on the challenge
 * day itself. Submissions for the same problem from before it became the
 * daily, or after its UTC day ended, are left out, and so are re-submissions
 * made after the pass (to try other approaches or chase better percentiles).
 *
 * @param own The author's own submissions for the day, in any order.
 * @param date The challenge day as `YYYY-MM-DD`.
 * @returns The 1-based position of the earliest accepted submission among
 *   that UTC day's submissions ordered by submission time; null when nothing
 *   was accepted that day.
 */
function countAttemptsToSolve(own: Solution[], date: string): number | null {
  const chronological = own
    .filter((s) => formatDateUTC(new Date(s.date)) === date)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const firstAccepted = chronological.findIndex(
    (s) => s.status === SolutionStatus.Done,
  );
  return firstAccepted === -1 ? null : firstAccepted + 1;
}

/**
 * Derives the author's progress on one day from its archived solutions.
 *
 * @param solutions The day's solutions, in any order.
 * @param date The challenge day as `YYYY-MM-DD`, used to tell a failed past
 *   day from one that is still in progress.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The solve status plus attempt counts, languages, best accepted
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
    solveStatus: resolveStatus(own, date, today),
    attempts: own.length,
    attemptsToSolve: countAttemptsToSolve(own, date),
    languages: [...new Set(own.map((s) => s.language))],
    bestRuntime,
    bestMemory,
    hasEditorial: own.length < solutions.length,
  };
}

/**
 * Tells whether a submission ran out of time or memory, which means the
 * approach itself worked and only its cost was too high. Failed-constraints
 * runs count too: they hit a runtime limit LeetCode doesn't report as a time
 * or memory limit exceeded, such as a heap out of memory or an oversized
 * string.
 *
 * @param solution The solution to classify.
 * @returns True for a time limit exceeded, memory limit exceeded or failed
 *   constraints submission.
 */
function exceededALimit(solution: Solution): boolean {
  return (
    solution.status === SolutionStatus.TimeLimitExceeded ||
    solution.status === SolutionStatus.MemoryLimitExceeded ||
    solution.status === SolutionStatus.FailedConstraints
  );
}

/**
 * Maps the author's own submissions for a day to a `SolveStatus`.
 *
 * @param own The author's own submissions for the day.
 * @param date The challenge day as `YYYY-MM-DD`.
 * @param today The reference "today".
 * @returns Solved when anything was accepted, FunctionallyCorrect when the
 *   best outcome exceeded a time, memory or other runtime limit, Pending for
 *   an untouched day still in progress, otherwise Failed.
 */
function resolveStatus(
  own: Solution[],
  date: string,
  today: Date,
): SolveStatus {
  if (own.some((s) => s.status === SolutionStatus.Done)) {
    return SolveStatus.Solved;
  }
  if (own.some(exceededALimit)) {
    return SolveStatus.FunctionallyCorrect;
  }
  if (own.length === 0 && !isPastDateUTC(date, today)) {
    return SolveStatus.Pending;
  }
  return SolveStatus.Failed;
}

/** The per-day inputs `computeArchiveStats` aggregates. */
export interface DayOutcome {
  date: string;
  difficulty: Difficulty;
  solveStatus: SolveStatus;
}

/**
 * Tells whether a day keeps a streak alive. Only a failed or never attempted
 * day breaks one, so a day that was merely too slow still counts.
 *
 * @param status The day's solve status, or undefined when the day is missing
 *   from the archive.
 * @returns True for a solved or functionally correct day.
 */
export function continuesStreak(status: SolveStatus | undefined): boolean {
  return (
    status === SolveStatus.Solved || status === SolveStatus.FunctionallyCorrect
  );
}

/**
 * Counts the longest run of consecutive streak-keeping calendar days. Days
 * missing from the archive break a run just like failed ones do.
 *
 * @param streakDates The streak-keeping days as `YYYY-MM-DD`, in any order.
 * @returns The length of the longest run; zero when there are no such days.
 */
export function longestStreak(streakDates: Iterable<string>): number {
  const kept = new Set(streakDates);
  let longest = 0;

  for (const date of kept) {
    if (kept.has(shiftDateUTC(date, -1))) continue;

    let length = 0;
    let cursor = date;
    while (kept.has(cursor)) {
      length += 1;
      cursor = shiftDateUTC(cursor, 1);
    }
    longest = Math.max(longest, length);
  }

  return longest;
}

/**
 * Counts the consecutive streak-keeping calendar days ending at today. A
 * today that is still pending is skipped rather than breaking the streak, so
 * the count doesn't drop to zero every morning before the day is solved.
 *
 * @param statusByDate Each archived day's solve status, keyed by
 *   `YYYY-MM-DD`.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The current streak length; zero when the most recent finished
 *   day was failed or never attempted.
 */
export function currentStreak(
  statusByDate: ReadonlyMap<string, SolveStatus>,
  today: Date = todayUTC(),
): number {
  let cursor = formatDateUTC(today);
  if (statusByDate.get(cursor) === SolveStatus.Pending) {
    cursor = shiftDateUTC(cursor, -1);
  }

  let streak = 0;
  while (continuesStreak(statusByDate.get(cursor))) {
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
    [SolveStatus.FunctionallyCorrect]: 0,
    [SolveStatus.Failed]: 0,
    [SolveStatus.Pending]: 0,
  };

  for (const { date, difficulty, solveStatus } of outcomes) {
    statusByDate.set(date, solveStatus);
    counts[solveStatus] += 1;
    const tier = byDifficulty[difficulty];
    tier.total += 1;
    if (solveStatus === SolveStatus.Solved) tier.solved += 1;
  }

  const streakDates = outcomes
    .filter((o) => continuesStreak(o.solveStatus))
    .map((o) => o.date);

  return {
    totalDays: outcomes.length,
    solved: counts[SolveStatus.Solved],
    functionallyCorrect: counts[SolveStatus.FunctionallyCorrect],
    failed: counts[SolveStatus.Failed],
    pending: counts[SolveStatus.Pending],
    byDifficulty,
    currentStreak: currentStreak(statusByDate, today),
    longestStreak: longestStreak(streakDates),
  };
}
