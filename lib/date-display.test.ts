import { describe, it, expect, vi, afterEach } from "vitest";
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
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:05:00.000Z"));
    expect(timeAgo("2026-07-25T12:00:00.000Z")).toBe("5 minutes ago");
  });

  it("floors partial units instead of rounding up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:01:30.000Z"));
    expect(timeAgo("2026-07-25T12:00:00.000Z")).toBe("1 minute ago");
  });

  it("reports days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
    expect(timeAgo("2026-07-24T12:00:00.000Z")).toBe("1 day ago");
  });

  it("reports years ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
    expect(timeAgo("2024-07-25T12:00:00.000Z")).toBe("2 years ago");
  });

  it("reports 0 seconds elapsed", () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-25T12:00:00.000Z");
    vi.setSystemTime(now);
    expect(timeAgo(now)).toBe("0 seconds ago");
  });
});
