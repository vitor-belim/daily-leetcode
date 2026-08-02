/**
 * Formats a timestamp as `YYYY-MM-DD HH:mm` in the viewer's local time.
 * Local-time display formatting lives here, deliberately separate from the
 * UTC-only archive logic in `dates.ts`; the UTC-vs-local split was a past
 * bug source and the two must not be merged.
 *
 * @param date The timestamp to format, as a Date or a date string.
 * @returns The local-time `YYYY-MM-DD HH:mm` string.
 */
export function formatDate(date: string | Date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Picks the English ordinal suffix for a day-of-month.
 *
 * @param day The day of the month (1-31).
 * @returns One of "st", "nd", "rd" or "th".
 */
function ordinalSuffix(day: number) {
  if (day % 10 === 1 && day % 100 !== 11) return "st";
  if (day % 10 === 2 && day % 100 !== 12) return "nd";
  if (day % 10 === 3 && day % 100 !== 13) return "rd";
  return "th";
}

/**
 * Formats a `YYYY-MM-DD` day as a long English date, e.g. "July 25th, 2026".
 *
 * @param date The `YYYY-MM-DD` day to format.
 * @returns The "MonthName Dth, YYYY" string; malformed input produces
 *   garbage output rather than throwing.
 */
export function formatLongDate(date: string) {
  const [year = NaN, month = NaN, day = NaN] = date.split("-").map(Number);
  const monthName = MONTH_NAMES[month - 1];

  return `${monthName} ${day}${ordinalSuffix(day)}, ${year}`;
}

/**
 * Renders how long ago a timestamp was, in the largest whole unit, e.g.
 * "5 minutes ago" or "2 years ago". Partial units are floored.
 *
 * @param date The past timestamp, as a Date or a date string.
 * @returns The English relative-time phrase. The final loop iteration
 *   (seconds) always returns, so the trailing throw is unreachable.
 */
interface RelativeTimeUnit {
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const units: RelativeTimeUnit[] = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const { unit, seconds } of units) {
    if (diffInSeconds >= seconds || unit === "second") {
      const count = Math.floor(diffInSeconds / seconds);
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });
      return rtf.format(-count, unit);
    }
  }

  throw new Error("unreachable");
}
