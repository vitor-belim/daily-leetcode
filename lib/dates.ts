/**
 * Formats a Date as `YYYY-MM-DD` using its UTC components. All date handling
 * in this module is deliberately UTC-only: LeetCode's daily challenge rolls
 * over at UTC midnight, and local-time equivalents previously caused
 * off-by-one bugs near local midnight at non-UTC-0 offsets.
 *
 * @param date The date to format.
 * @returns The `YYYY-MM-DD` string for the date's UTC day.
 */
export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a `YYYY-MM-DD` string into a Date at UTC midnight of that day.
 *
 * @param dateStr The `YYYY-MM-DD` string to parse.
 * @returns The Date at 00:00:00 UTC of that day, or an Invalid Date when the
 *   string is malformed (missing segments parse as NaN).
 */
export function parseDateUTC(dateStr: string): Date {
  const [y = NaN, m = NaN, d = NaN] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Returns the current UTC day as a Date at UTC midnight.
 *
 * @returns Today's date truncated to 00:00:00 UTC.
 */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Checks whether a `YYYY-MM-DD` string names a real calendar date, rejecting
 * rollovers like `2026-02-30` that Date would silently normalize.
 *
 * @param dateStr The `YYYY-MM-DD` string to validate.
 * @returns True when the string round-trips to the same UTC year/month/day.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  const [y = NaN, m = NaN, d = NaN] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Checks whether a date's UTC day is fully over, i.e. nothing new can land
 * on it.
 *
 * @param date The `YYYY-MM-DD` day to test.
 * @param today The reference "today" (defaults to the current UTC day).
 * @returns True when `date` is strictly before `today`'s UTC day.
 */
export function isPastDateUTC(date: string, today: Date = todayUTC()): boolean {
  return date < formatDateUTC(today);
}

/**
 * Shifts a `YYYY-MM-DD` day by a number of days in UTC.
 *
 * @param date The `YYYY-MM-DD` starting day.
 * @param days The offset in days; negative values shift into the past.
 * @returns The shifted day as a `YYYY-MM-DD` string.
 */
export function shiftDateUTC(date: string, days: number): string {
  const shifted = parseDateUTC(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return formatDateUTC(shifted);
}

/**
 * Formats a Date's UTC month as `YYYY-MM`.
 *
 * @param date The date to format.
 * @returns The `YYYY-MM` string for the date's UTC month.
 */
export function formatMonthUTC(date: Date): string {
  return formatDateUTC(date).slice(0, 7);
}

/**
 * Extracts the `YYYY-MM` month of a `YYYY-MM-DD` day.
 *
 * @param date The `YYYY-MM-DD` day.
 * @returns Its `YYYY-MM` month.
 */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * Shifts a `YYYY-MM` month by a number of months.
 *
 * @param month The `YYYY-MM` starting month.
 * @param months The offset in months; negative values shift into the past.
 * @returns The shifted month as `YYYY-MM`.
 */
export function shiftMonth(month: string, months: number): string {
  const [y = NaN, m = NaN] = month.split("-").map(Number);
  return formatMonthUTC(new Date(Date.UTC(y, m - 1 + months, 1)));
}
