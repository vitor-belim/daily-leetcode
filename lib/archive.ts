import fs from "fs";
import path from "path";
import {
  formatDateUTC,
  formatMonthUTC,
  isValidCalendarDate,
  monthOf,
  parseDateUTC,
  shiftMonth,
  todayUTC,
} from "./dates";
import { PROBLEMS_ROOT } from "./paths";

/**
 * Scans a `YYYY/MM/DD.json` archive tree and lists every day that has a
 * file, ignoring entries that don't match the naming convention or don't
 * form a real calendar date.
 *
 * @param root The archive root to scan (defaults to `data/problems`).
 * @returns The filled days as sorted-ascending `YYYY-MM-DD` strings; empty
 *   when the root doesn't exist.
 */
export function collectFilledDates(root: string = PROBLEMS_ROOT): string[] {
  if (!fs.existsSync(root)) return [];

  const dates: string[] = [];
  const years = fs.readdirSync(root).filter((y) => /^\d{4}$/.test(y));

  for (const year of years) {
    const yearDir = path.join(root, year);
    const months = fs
      .readdirSync(yearDir)
      .filter((m) => /^(0[1-9]|1[0-2])$/.test(m));

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const days = fs
        .readdirSync(monthDir)
        .filter((f) => /^\d{2}\.json$/.test(f))
        .map((f) => f.slice(0, 2));

      for (const day of days) {
        const dateStr = `${year}-${month}-${day}`;
        if (isValidCalendarDate(dateStr)) {
          dates.push(dateStr);
        }
      }
    }
  }

  return dates.sort();
}

/** The `[year]/[month]/[day]` segments of one archived day's blog route. */
export interface ArchivedDayParams {
  year: string;
  month: string;
  day: string;
}

/**
 * Lists every archived day as blog route segments, for the blog page's
 * `generateStaticParams`.
 *
 * @param root The archive root to scan (defaults to `data/problems`).
 * @returns One entry per filled day, ascending; empty when the root doesn't
 *   exist.
 */
export function listArchivedDayParams(
  root: string = PROBLEMS_ROOT,
): ArchivedDayParams[] {
  return collectFilledDates(root).flatMap((date) => {
    const [year, month, day] = date.split("-");
    return year && month && day ? [{ year, month, day }] : [];
  });
}

/**
 * Lists every calendar month from the oldest archived month through today's
 * month, inclusive. That covers every `before` cursor the home list can ask
 * for: the first page's cursor is a calendar month that may hold no data,
 * and later cursors are archived months, all within this range.
 *
 * @param root The archive root to scan (defaults to `data/problems`).
 * @param today The range end (defaults to the current UTC day).
 * @returns The months as ascending `YYYY-MM` strings; empty when nothing is
 *   archived.
 */
export function listMonthCursors(
  root: string = PROBLEMS_ROOT,
  today: Date = todayUTC(),
): string[] {
  const oldest = collectFilledDates(root)[0];
  if (oldest === undefined) return [];

  const last = formatMonthUTC(today);
  const months: string[] = [];
  for (
    let month = monthOf(oldest);
    month <= last;
    month = shiftMonth(month, 1)
  ) {
    months.push(month);
  }
  return months;
}

/**
 * Finds the days missing from a filled-dates list, scanning from a start day
 * through today inclusive. The start defaults to the first filled day, so
 * input does not need to be pre-sorted beyond its first element being the
 * range start, which is how `collectFilledDates` returns it.
 *
 * @param filledDates The days that already have data, sorted ascending.
 * @param today The scan end (defaults to the current UTC day).
 * @param from The scan start as `YYYY-MM-DD` (defaults to the first filled
 *   day), letting a backfill reach further back than the archive does.
 * @returns The missing days as ascending `YYYY-MM-DD` strings; empty when
 *   there is no start day (`filledDates` empty and no `from`).
 */
export function getMissingDates(
  filledDates: string[],
  today: Date = todayUTC(),
  from?: string,
): string[] {
  const rangeStart = from ?? filledDates[0];
  if (rangeStart === undefined) return [];

  const filledSet = new Set(filledDates);
  const cursor = parseDateUTC(rangeStart);

  const missingDates: string[] = [];
  while (cursor <= today) {
    const dateStr = formatDateUTC(cursor);
    if (!filledSet.has(dateStr)) {
      missingDates.push(dateStr);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return missingDates;
}

/**
 * Lists every day an archive is missing, from its oldest day through today,
 * interior gaps included. This is what a scheduled run that was skipped for a
 * few days (machine off, expired auth) needs to catch up on. An empty archive
 * scans today alone, so a first run still seeds the current day.
 *
 * @param root The archive root to scan (defaults to `data/problems`).
 * @param today The scan end (defaults to the current UTC day).
 * @returns The missing days as ascending `YYYY-MM-DD` strings; empty when the
 *   archive is complete through today.
 */
export function listMissingDates(
  root: string = PROBLEMS_ROOT,
  today: Date = todayUTC(),
): string[] {
  const filledDates = collectFilledDates(root);
  return getMissingDates(
    filledDates,
    today,
    filledDates[0] ?? formatDateUTC(today),
  );
}
