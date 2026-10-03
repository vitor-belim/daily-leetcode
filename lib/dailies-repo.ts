import "server-only";
import { collectFilledDates } from "./archive";
import { formatMonthUTC, monthOf, shiftMonth, todayUTC } from "./dates";
import { PROBLEMS_ROOT, SOLUTIONS_ROOT } from "./paths";
import { readProblemFile } from "./problems-repo";
import { computeArchiveStats, summarizeSolutions } from "./solve-status";
import { readSolutionsFile } from "./solutions-repo";
import type {
  ArchiveStats,
  DailySummary,
  LatestDailies,
  Problem,
  Solution,
} from "./types";

/** The two archive roots a summary is assembled from. */
export interface ArchiveRoots {
  problems: string;
  solutions: string;
}

const DEFAULT_ROOTS: ArchiveRoots = {
  problems: PROBLEMS_ROOT,
  solutions: SOLUTIONS_ROOT,
};

/** A run of whole calendar months sliced out of the archive, newest first. */
export interface MonthPage {
  /** The selected days, newest first. */
  dates: string[];
  /** Total archived days, across all months. */
  total: number;
  /** Whether any archived day is older than this page. */
  hasMore: boolean;
  /**
   * Cursor for the next page: the oldest month covered by this page, to be
   * passed back as `before`. Null when nothing older remains.
   */
  nextCursor: string | null;
}

/**
 * Slices whole calendar months out of an ascending-sorted list of days.
 * Without a cursor the page starts at today's month, so the first page is
 * "this month plus the N-1 before it" whether or not they hold data. With a
 * cursor it starts at the newest archived month older than the cursor, so
 * paging never serves an empty month.
 *
 * @param datesAscending Every archived day, sorted ascending.
 * @param months How many calendar months to cover.
 * @param before A `YYYY-MM` month; only strictly older months are served.
 *   Null starts from today's month.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The covered days newest first, the total day count, whether
 *   older days remain and the cursor for the next page.
 */
export function paginateByMonth(
  datesAscending: string[],
  months: number,
  before: string | null,
  today: Date = todayUTC(),
): MonthPage {
  const total = datesAscending.length;
  const startMonth =
    before === null
      ? formatMonthUTC(today)
      : newestMonthBefore(datesAscending, before);

  if (startMonth === null || months < 1) {
    return { dates: [], total, hasMore: false, nextCursor: null };
  }

  const endMonth = shiftMonth(startMonth, -(months - 1));
  const dates = datesAscending
    .filter((d) => monthOf(d) >= endMonth && monthOf(d) <= startMonth)
    .reverse();
  const hasMore = datesAscending.some((d) => monthOf(d) < endMonth);

  return { dates, total, hasMore, nextCursor: hasMore ? endMonth : null };
}

/**
 * Finds the newest archived month strictly older than a cursor.
 *
 * @param datesAscending Every archived day, sorted ascending.
 * @param before The exclusive `YYYY-MM` upper bound.
 * @returns That month as `YYYY-MM`, or null when nothing is older.
 */
function newestMonthBefore(
  datesAscending: string[],
  before: string,
): string | null {
  for (let i = datesAscending.length - 1; i >= 0; i -= 1) {
    const month = monthOf(datesAscending[i] ?? "");
    if (month < before) return month;
  }
  return null;
}

/**
 * Combines one day's problem with the progress derived from its solutions.
 *
 * @param problem The archived problem.
 * @param solutions The day's archived solutions, or null when its solutions
 *   file does not exist yet.
 * @param date The day as `YYYY-MM-DD`.
 * @param today The reference "today" for pending-vs-failed.
 * @returns The day's summary, holding only the fields the home list renders.
 */
function summarizeDay(
  problem: Problem,
  solutions: Solution[] | null,
  date: string,
  today: Date,
): DailySummary {
  return {
    date,
    title: problem.title,
    difficulty: problem.difficulty,
    ...summarizeSolutions(solutions, date, today),
  };
}

/**
 * Reads one day's problem and solutions in parallel and summarizes them.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param roots The archive roots.
 * @param today The reference "today" for pending-vs-failed.
 * @returns The summary, or null when the problem file has disappeared since
 *   the archive scan.
 * @throws When the day's problem or solutions file exists but cannot be
 *   read, fails to parse or holds the wrong shape, even if the other file is
 *   missing.
 */
async function loadDay(
  date: string,
  roots: ArchiveRoots,
  today: Date,
): Promise<DailySummary | null> {
  const [problem, solutions] = await Promise.all([
    readProblemFile(date, roots.problems),
    readSolutionsFile(date, roots.solutions),
  ]);
  return problem ? summarizeDay(problem, solutions, date, today) : null;
}

/**
 * Loads a run of whole calendar months of archived days as summaries,
 * newest first. See {@link paginateByMonth} for how the run is chosen.
 *
 * @param months How many calendar months to cover.
 * @param before A `YYYY-MM` cursor from a previous page's `nextCursor`, or
 *   null to start from today's month.
 * @param roots The archive roots (default to `data/problems` and
 *   `data/solutions`).
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns The summaries (days whose problem file disappeared since the scan
 *   are dropped), the total day count, whether older days remain, and the
 *   next cursor.
 * @throws When a covered day's problem or solutions file exists but cannot
 *   be read, fails to parse or holds the wrong shape, so a corrupted archive
 *   fails the prerender instead of silently dropping or misreporting the
 *   day.
 */
export async function getDailySummariesByMonth(
  months: number,
  before: string | null,
  roots: ArchiveRoots = DEFAULT_ROOTS,
  today: Date = todayUTC(),
): Promise<LatestDailies> {
  const dates = collectFilledDates(roots.problems);
  const page = paginateByMonth(dates, months, before, today);
  const loaded = await Promise.all(
    page.dates.map((date) => loadDay(date, roots, today)),
  );
  const dailies = loaded.filter((d): d is DailySummary => d !== null);

  return {
    dailies,
    total: page.total,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}

/**
 * Aggregates progress over every archived day.
 *
 * @param roots The archive roots (default to `data/problems` and
 *   `data/solutions`).
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns Archive-wide totals, per-difficulty counts and streaks; days
 *   whose problem file disappeared since the scan are skipped.
 * @throws When any day's problem or solutions file exists but cannot be
 *   read, fails to parse or holds the wrong shape, so a corrupted archive
 *   fails the prerender instead of skewing the stats.
 */
export async function getArchiveStats(
  roots: ArchiveRoots = DEFAULT_ROOTS,
  today: Date = todayUTC(),
): Promise<ArchiveStats> {
  const dates = collectFilledDates(roots.problems);
  const loaded = await Promise.all(
    dates.map((date) => loadDay(date, roots, today)),
  );
  const outcomes = loaded.filter((d): d is DailySummary => d !== null);

  return computeArchiveStats(outcomes, today);
}
