import fs from "fs";
import path from "path";
import {
  formatDateUTC,
  isValidCalendarDate,
  parseDateUTC,
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

/**
 * Finds the days missing from a filled-dates list, scanning from the first
 * filled day through today inclusive. Input does not need to be pre-sorted
 * beyond its first element being the range start, which is how
 * `collectFilledDates` returns it.
 *
 * @param filledDates The days that already have data, sorted ascending.
 * @param today The scan end (defaults to the current UTC day).
 * @returns The missing days as ascending `YYYY-MM-DD` strings; empty when
 *   `filledDates` is empty (no range to scan).
 */
export function getMissingDates(
  filledDates: string[],
  today: Date = todayUTC(),
): string[] {
  const rangeStart = filledDates[0];
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
