import { describe, it, expect } from "vitest";
import {
  formatDateUTC,
  parseDateUTC,
  todayUTC,
  isValidCalendarDate,
  shiftDateUTC,
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
    // 2028 is a leap year.
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
