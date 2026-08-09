import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatLongDate, timeAgo } from "./date-display";

describe("formatLongDate", () => {
  it("formats a date with the correct ordinal suffix", () => {
    expect(formatLongDate("2026-07-25")).toBe("July 25th, 2026");
  });

  it.each([
    ["2026-01-01", "January 1st, 2026"],
    ["2026-01-02", "January 2nd, 2026"],
    ["2026-01-03", "January 3rd, 2026"],
    ["2026-01-04", "January 4th, 2026"],
    ["2026-01-11", "January 11th, 2026"],
    ["2026-01-12", "January 12th, 2026"],
    ["2026-01-13", "January 13th, 2026"],
    ["2026-01-21", "January 21st, 2026"],
    ["2026-01-22", "January 22nd, 2026"],
    ["2026-01-23", "January 23rd, 2026"],
    ["2026-01-31", "January 31st, 2026"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatLongDate(input)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("formats a Date object using local time", () => {
    expect(formatDate(new Date(2026, 6, 25, 9, 5))).toBe("2026-07-25 09:05");
  });

  it("formats a date string input", () => {
    const d = new Date(2026, 0, 1, 0, 0);
    expect(formatDate(d.toISOString())).toBe(formatDate(d));
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatDate(new Date(2026, 0, 5, 1, 2))).toBe("2026-01-05 01:02");
  });
});

describe("timeAgo", () => {
  // Every case below is expressed as a timestamp relative to this frozen "now"
  const NOW = "2026-07-25T12:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports seconds ago", () => {
    expect(timeAgo("2026-07-25T11:59:15.000Z")).toBe("45 seconds ago");
  });

  it("uses the singular unit name for a count of one", () => {
    expect(timeAgo("2026-07-25T11:59:59.000Z")).toBe("1 second ago");
  });

  it("reports minutes ago", () => {
    expect(timeAgo("2026-07-25T11:55:00.000Z")).toBe("5 minutes ago");
  });

  it("rounds partial minutes to the nearest whole minute", () => {
    // 90s is exactly halfway, rounding up to 2 minutes
    expect(timeAgo("2026-07-25T11:58:30.000Z")).toBe("2 minutes ago");
  });

  it("rounds down when below the halfway point", () => {
    // 80s displays as 1 minute
    expect(timeAgo("2026-07-25T11:58:40.000Z")).toBe("1 minute ago");
  });

  it("reports hours ago", () => {
    expect(timeAgo("2026-07-25T07:00:00.000Z")).toBe("5 hours ago");
  });

  it("accepts a Date instance as well as a string", () => {
    expect(timeAgo(new Date("2026-07-25T11:00:00.000Z"))).toBe("1 hour ago");
  });

  it("reports days ago", () => {
    expect(timeAgo("2026-07-24T12:00:00.000Z")).toBe("1 day ago");
  });

  it("pluralizes whole days", () => {
    expect(timeAgo("2026-07-22T12:00:00.000Z")).toBe("3 days ago");
  });

  it("picks the largest whole unit that fits", () => {
    // 25 hours is past the 1-day threshold, so it renders as days, not hours
    expect(timeAgo("2026-07-24T11:00:00.000Z")).toBe("1 day ago");
  });

  it("stays in days below the 30-day month threshold", () => {
    expect(timeAgo("2026-06-26T12:00:00.000Z")).toBe("29 days ago");
  });

  it("switches to months at exactly 30 days", () => {
    expect(timeAgo("2026-06-25T12:00:00.000Z")).toBe("1 month ago");
  });

  it("breaks months down into months and days", () => {
    // 35 days is 1 month (30 days) with 5 days left over
    expect(timeAgo("2026-06-20T12:00:00.000Z")).toBe("1 month 5 days ago");
  });

  it("rounds the day remainder of a month breakdown to the nearest day", () => {
    // 34 days 14 hours is 1 month plus 4 days 14 hours, which rounds to 5 days
    expect(timeAgo("2026-06-20T22:00:00.000Z")).toBe("1 month 5 days ago");
  });

  it("pluralizes the day remainder of a month breakdown", () => {
    // 45 days is 1 month (30 days) with 15 days left over
    expect(timeAgo("2026-06-10T12:00:00.000Z")).toBe("1 month 15 days ago");
  });

  it("omits a zero-day remainder from a month breakdown", () => {
    // 60 days is exactly 2 of the 30-day month units
    expect(timeAgo("2026-05-26T12:00:00.000Z")).toBe("2 months ago");
  });

  it("breaks years down into years and months", () => {
    // 400 days is 1 year (365 days) plus 35 days, which rounds to 1 month
    expect(timeAgo("2025-06-20T12:00:00.000Z")).toBe("1 year 1 month ago");
  });

  it("pluralizes the month remainder of a year breakdown", () => {
    // 425 days is 1 year (365 days) plus exactly 2 of the 30-day months
    expect(timeAgo("2025-05-26T12:00:00.000Z")).toBe("1 year 2 months ago");
  });

  it("omits a zero-month remainder from a year breakdown", () => {
    // 730 days is exactly 2 of the 365-day year units
    expect(timeAgo("2024-07-25T12:00:00.000Z")).toBe("2 years ago");
  });

  it("carries a remainder that rounds up to a full primary unit", () => {
    // 729 days is 1 year plus 364 days; 364 days rounds to 12 months,
    // which carries over to 2 years instead of "1 year 12 months"
    expect(timeAgo("2024-07-26T12:00:00.000Z")).toBe("2 years ago");
  });

  it("reports 0 seconds elapsed", () => {
    expect(timeAgo(NOW)).toBe("0 seconds ago");
  });

  it("clamps future timestamps to 0 seconds instead of going negative", () => {
    expect(timeAgo("2026-07-25T12:05:00.000Z")).toBe("0 seconds ago");
  });

  it("renders unparseable input as 0 seconds rather than NaN", () => {
    expect(timeAgo("not a date")).toBe("0 seconds ago");
  });
});
