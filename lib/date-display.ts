/** The calendar and clock fields of one instant, as read in some time zone. */
interface DateTimeFields {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

/**
 * Left-pads a calendar or clock field to two digits.
 *
 * @param value The field value.
 * @returns The value as a string of at least two characters.
 */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Joins calendar and clock fields into a zero-padded `YYYY-MM-DD HH:mm`
 * string.
 *
 * @param fields The fields to join, with a 1-based month.
 * @returns The `YYYY-MM-DD HH:mm` string; `NaN` fields from an unparseable
 *   timestamp come through as `NaN` rather than throwing.
 */
function joinDateTimeFields({
  year,
  month,
  day,
  hours,
  minutes,
}: DateTimeFields): string {
  return `${year}-${padTwoDigits(month)}-${padTwoDigits(day)} ${padTwoDigits(hours)}:${padTwoDigits(minutes)}`;
}

/**
 * Formats a timestamp as `YYYY-MM-DD HH:mm` in the local time zone of the
 * JavaScript runtime that calls it. That is the viewer's zone only when it
 * runs in the browser: on the server or at build time it is the host's zone
 * (UTC on Vercel), so server-rendered markup must not show it unlabelled.
 * The `LocalDateTime` client component renders {@link formatDateTimeUTC} on
 * the server and swaps in this after hydration. Local-time display
 * formatting lives here, deliberately separate from the UTC-only archive
 * logic in `dates.ts`; the UTC-vs-local split was a past bug source and the
 * two must not be merged.
 *
 * @param date The timestamp to format, as a Date or a date string.
 * @returns The `YYYY-MM-DD HH:mm` string in the runtime's local time zone.
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);

  return joinDateTimeFields({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  });
}

/**
 * Formats a timestamp as `YYYY-MM-DD HH:mm UTC`, the same in every runtime
 * and time zone. This is the server-rendered and hydration-time text of the
 * `LocalDateTime` client component, labelled so a reader whose script never
 * runs can still tell which zone it is in.
 *
 * @param date The timestamp to format, as a Date or a date string.
 * @returns The `YYYY-MM-DD HH:mm UTC` string.
 */
export function formatDateTimeUTC(date: string | Date): string {
  const d = new Date(date);
  const fields = joinDateTimeFields({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  });

  return `${fields} UTC`;
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
 * Formats a `YYYY-MM-DD` day as a compact English date with a three-letter
 * month, e.g. "Sep 30th, 2026", for places too narrow for the long form.
 *
 * @param date The `YYYY-MM-DD` day to format.
 * @returns The "Mon Dth, YYYY" string; malformed input produces garbage
 *   output rather than throwing.
 */
export function formatShortDate(date: string) {
  const [year = NaN, month = NaN, day = NaN] = date.split("-").map(Number);
  const monthName = MONTH_NAMES[month - 1]?.slice(0, 3);

  return `${monthName} ${day}${ordinalSuffix(day)}, ${year}`;
}

enum RelativeTimeUnitName {
  Year = "year",
  Month = "month",
  Day = "day",
  Hour = "hour",
  Minute = "minute",
  Second = "second",
}

/**
 * One component of a relative-time phrase: its English singular name and
 * its fixed length in seconds.
 */
interface RelativeTimeComponent {
  readonly unit: RelativeTimeUnitName;
  readonly seconds: number;
}

/**
 * A display unit for {@link timeAgo}. When `secondary` is present, the
 * remainder below one primary unit is shown in that smaller unit, e.g.
 * "2 months 10 days ago".
 */
interface RelativeTimeUnit extends RelativeTimeComponent {
  readonly secondary?: RelativeTimeComponent;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

const YEAR_COMPONENT: RelativeTimeComponent = {
  unit: RelativeTimeUnitName.Year,
  seconds: SECONDS_PER_YEAR,
};

const MONTH_COMPONENT: RelativeTimeComponent = {
  unit: RelativeTimeUnitName.Month,
  seconds: SECONDS_PER_MONTH,
};

const DAY_COMPONENT: RelativeTimeComponent = {
  unit: RelativeTimeUnitName.Day,
  seconds: SECONDS_PER_DAY,
};

const HOUR_COMPONENT: RelativeTimeComponent = {
  unit: RelativeTimeUnitName.Hour,
  seconds: SECONDS_PER_HOUR,
};

const MINUTE_COMPONENT: RelativeTimeComponent = {
  unit: RelativeTimeUnitName.Minute,
  seconds: SECONDS_PER_MINUTE,
};

const SECOND_UNIT: RelativeTimeUnit = {
  unit: RelativeTimeUnitName.Second,
  seconds: 1,
};

const RELATIVE_TIME_UNITS: readonly RelativeTimeUnit[] = [
  {
    ...YEAR_COMPONENT,
    secondary: MONTH_COMPONENT,
  },
  {
    ...MONTH_COMPONENT,
    secondary: DAY_COMPONENT,
  },
  DAY_COMPONENT,
  HOUR_COMPONENT,
  MINUTE_COMPONENT,
  SECOND_UNIT,
];

/**
 * Measures how much time has passed since a timestamp, in whole seconds.
 * Future timestamps and unparseable input both clamp to zero so callers
 * never render a negative or `NaN` duration.
 *
 * @param date The timestamp to measure from, as a Date or a date string.
 * @returns The elapsed whole seconds, never negative and never `NaN`.
 */
function elapsedSeconds(date: Date | string): number {
  const elapsedMilliseconds = Date.now() - new Date(date).getTime();

  if (!Number.isFinite(elapsedMilliseconds)) return 0;

  return Math.max(0, Math.floor(elapsedMilliseconds / 1000));
}

/**
 * Picks the largest display unit that fits wholly into an elapsed duration.
 *
 * @param diffInSeconds The elapsed time in seconds, expected to be
 *   non-negative.
 * @returns The matching unit, falling back to seconds for durations shorter
 *   than one minute.
 */
function selectRelativeTimeUnit(diffInSeconds: number): RelativeTimeUnit {
  return (
    RELATIVE_TIME_UNITS.find((entry) => diffInSeconds >= entry.seconds) ??
    SECOND_UNIT
  );
}

/**
 * The whole-unit counts displayed for an elapsed duration: the count of
 * primary units plus the rounded remainder in the secondary unit (zero
 * when the unit has no secondary breakdown or the remainder rounds away).
 */
interface RelativeTimeBreakdown {
  readonly primaryCount: number;
  readonly secondaryCount: number;
}

/**
 * Splits an elapsed duration into whole primary units plus a rounded
 * remainder in the unit's secondary component. Without a secondary
 * component the duration is rounded to the nearest primary unit. A
 * remainder that rounds up to a whole primary unit carries over instead of
 * being displayed, so 729 elapsed days yields 2 years rather than the
 * nonsensical 1 year 12 months.
 *
 * @param diffInSeconds The elapsed time in seconds, expected to be
 *   non-negative.
 * @param unit The display unit to break the duration into.
 * @returns The primary and secondary whole-unit counts; the secondary count
 *   is zero when the unit has no secondary component or the remainder
 *   rounded away or carried over.
 */
function breakDownElapsed(
  diffInSeconds: number,
  unit: RelativeTimeUnit,
): RelativeTimeBreakdown {
  const { secondary } = unit;

  if (!secondary) {
    return {
      primaryCount: Math.round(diffInSeconds / unit.seconds),
      secondaryCount: 0,
    };
  }

  const primaryCount = Math.floor(diffInSeconds / unit.seconds);
  const remainder = diffInSeconds - primaryCount * unit.seconds;
  const secondaryCount = Math.round(remainder / secondary.seconds);
  const secondariesPerPrimary = Math.floor(unit.seconds / secondary.seconds);

  if (secondaryCount >= secondariesPerPrimary) {
    return { primaryCount: primaryCount + 1, secondaryCount: 0 };
  }

  return { primaryCount, secondaryCount };
}

/**
 * Formats one component of a relative-time phrase in English, e.g.
 * "1 month" or "10 days".
 *
 * @param count The whole-unit count.
 * @param unit The unit name, pluralized when the count is not one.
 * @returns The "<count> <unit>[s]" fragment.
 */
function relativeTimePart(count: number, unit: RelativeTimeUnitName): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * Renders how long ago a timestamp was, e.g. "5 minutes ago" or
 * "2 years ago", using fixed unit lengths (a month is 30 days, a year is
 * 365 days). Months break down into days ("2 months 10 days ago") and years
 * into months ("1 year 3 months ago"); a remainder of zero is omitted
 * ("2 months ago"). Partial units are rounded to the nearest whole unit.
 *
 * @param date The past timestamp, as a Date or a date string. Future and
 *   unparseable timestamps read as "0 seconds ago".
 * @returns The English relative-time phrase.
 */
export function timeAgo(date: Date | string): string {
  const diffInSeconds = elapsedSeconds(date);
  const entry = selectRelativeTimeUnit(diffInSeconds);
  const { primaryCount, secondaryCount } = breakDownElapsed(
    diffInSeconds,
    entry,
  );

  const primaryPart = relativeTimePart(primaryCount, entry.unit);
  const secondaryPart =
    entry.secondary && secondaryCount > 0
      ? ` ${relativeTimePart(secondaryCount, entry.secondary.unit)}`
      : "";

  return `${primaryPart}${secondaryPart} ago`;
}

const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a `YYYY-MM-DD` day as its month and year, e.g. "September 2026",
 * for grouping the archive list by month.
 *
 * @param date The `YYYY-MM-DD` day to format.
 * @returns The "MonthName YYYY" string; malformed input produces garbage
 *   output rather than throwing.
 */
export function formatMonthYear(date: string) {
  const [year = NaN, month = NaN] = date.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Names the weekday of a `YYYY-MM-DD` day in short English form, e.g. "Sat".
 * The day is interpreted in UTC, matching how challenge days are stored, so
 * the viewer's timezone can't shift it.
 *
 * @param date The `YYYY-MM-DD` day to format.
 * @returns The three-letter weekday name, or an empty string for a malformed
 *   day.
 */
export function formatWeekdayShort(date: string) {
  const [year = NaN, month = NaN, day = NaN] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_SHORT_NAMES[weekday] ?? "";
}
