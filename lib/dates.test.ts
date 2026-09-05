import { describe, it, expect } from "vitest";
import {
  formatDateUTC,
  parseDateUTC,
  todayUTC,
  isValidCalendarDate,
  shiftDateUTC,
  isPastDateUTC,
  formatMonthUTC,
  monthOf,
  shiftMonth,
} from "./dates";

describe("formatDateUTC / parseDateUTC", () => {
  it("round-trips a date string through UTC", () => {
    expect(formatDateUTC(parseDateUTC("2026-07-25"))).toBe("2026-07-25");
  });

  it("pads single-digit month and day", () => {
    expect(formatDateUTC(parseDateUTC("2026-01-05"))).toBe("2026-01-05");
  });

  it("handles a UTC month rollover", () => {
    const date = parseDateUTC("2026-01-31");
    date.setUTCDate(date.getUTCDate() + 1);
    expect(formatDateUTC(date)).toBe("2026-02-01");
  });

  it("handles a leap-year Feb 29 correctly", () => {
    const date = parseDateUTC("2028-02-28");
    date.setUTCDate(date.getUTCDate() + 1);
    expect(formatDateUTC(date)).toBe("2028-02-29");
  });
});

describe("todayUTC", () => {
  it("returns a date with no time-of-day component", () => {
    const date = todayUTC();
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });
});

describe("isValidCalendarDate", () => {
  it("accepts a real date", () => {
    expect(isValidCalendarDate("2026-07-25")).toBe(true);
  });

  it("accepts Feb 29 on a leap year", () => {
    // 2028 is a leap year.
    expect(isValidCalendarDate("2028-02-29")).toBe(true);
  });

  it("rejects Feb 29 on a non-leap year", () => {
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
  });

  it("rejects a nonexistent day like Feb 30", () => {
    expect(isValidCalendarDate("2026-02-30")).toBe(false);
  });

  it("rejects a nonexistent day like Apr 31", () => {
    expect(isValidCalendarDate("2026-04-31")).toBe(false);
  });
});

describe("shiftDateUTC", () => {
  it("shifts within a month", () => {
    expect(shiftDateUTC("2026-07-19", 1)).toBe("2026-07-20");
    expect(shiftDateUTC("2026-07-19", -1)).toBe("2026-07-18");
  });

  it("rolls over a month boundary", () => {
    expect(shiftDateUTC("2026-07-01", -1)).toBe("2026-06-30");
    expect(shiftDateUTC("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("rolls over a year boundary", () => {
    expect(shiftDateUTC("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateUTC("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap-year Feb 29 in both directions", () => {
    expect(shiftDateUTC("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDateUTC("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("isPastDateUTC", () => {
  const today = parseDateUTC("2026-08-02");

  it("is false for today", () => {
    expect(isPastDateUTC("2026-08-02", today)).toBe(false);
  });

  it("is true for any earlier day", () => {
    expect(isPastDateUTC("2026-08-01", today)).toBe(true);
    expect(isPastDateUTC("2025-12-31", today)).toBe(true);
  });

  it("is false for a future day", () => {
    expect(isPastDateUTC("2026-08-03", today)).toBe(false);
  });

  it("compares by UTC day, ignoring the time on `today`", () => {
    const lateInTheDay = new Date("2026-08-02T23:59:59.000Z");
    expect(isPastDateUTC("2026-08-02", lateInTheDay)).toBe(false);
    expect(isPastDateUTC("2026-08-01", lateInTheDay)).toBe(true);
  });

  it("orders correctly across month and year boundaries", () => {
    expect(isPastDateUTC("2026-07-31", parseDateUTC("2026-08-01"))).toBe(true);
    expect(isPastDateUTC("2026-01-01", parseDateUTC("2025-12-31"))).toBe(false);
  });
});

describe("formatMonthUTC / monthOf / shiftMonth", () => {
  it("formats the UTC month of a date", () => {
    expect(formatMonthUTC(new Date(Date.UTC(2026, 8, 5)))).toBe("2026-09");
  });

  it("extracts the month of a day", () => {
    expect(monthOf("2026-09-05")).toBe("2026-09");
  });

  it("shifts months across year boundaries in both directions", () => {
    expect(shiftMonth("2026-09", -1)).toBe("2026-08");
    expect(shiftMonth("2026-01", -2)).toBe("2025-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
