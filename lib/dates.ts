// All date handling here is UTC-only, deliberately: LeetCode's daily
// challenge rolls over at UTC midnight. Using local time previously caused
// an off-by-one bug near local midnight at non-UTC-0 timezone offsets
// (a day would be treated as missing/present a day early or late). Do not
// swap these for local-time equivalents.

export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isValidCalendarDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// True once `date`'s UTC day is over, i.e. nothing new can land on it.
export function isPastDateUTC(date: string, today: Date = todayUTC()): boolean {
  return date < formatDateUTC(today);
}

export function shiftDateUTC(date: string, days: number): string {
  const shifted = parseDateUTC(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return formatDateUTC(shifted);
}
