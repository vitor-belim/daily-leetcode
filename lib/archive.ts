import fs from "fs";
import path from "path";
import { PROBLEMS_ROOT } from "./paths";
import { formatDateUTC, parseDateUTC, todayUTC, isValidCalendarDate } from "./dates";

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

// Precondition: filledDates must be non-empty (indexes [0] as the range
// start) and does not need to be pre-sorted here since callers already
// receive it sorted from collectFilledDates. Callers must guard the
// empty-array case themselves before calling this.
export function getMissingDates(
  filledDates: string[],
  today: Date = todayUTC(),
): string[] {
  const filledSet = new Set(filledDates);
  const cursor = parseDateUTC(filledDates[0]);

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
