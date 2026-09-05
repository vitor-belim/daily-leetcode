import fs from "node:fs/promises";
import type { Problem } from "./types";
import { problemFilePath, PROBLEMS_ROOT } from "./paths";
import { isValidCalendarDate, shiftDateUTC } from "./dates";

/** The archived days directly before and after a date, when they exist. */
export interface AdjacentDates {
  prev: string | null;
  next: string | null;
}

/**
 * Reads and parses one problem file, logging failures instead of throwing.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The parsed problem, or null when reading/parsing fails.
 */
export async function readProblemFile(
  date: string,
  root: string = PROBLEMS_ROOT,
): Promise<Problem | null> {
  try {
    const content = await fs.readFile(problemFilePath(date, root), "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading problem for ${date}:`, error);
    return null;
  }
}

/**
 * Reads one day's archived problem, validating the date first so URL
 * segments can be passed straight in.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The problem, or null when the date is invalid, the file is
 *   missing, or it fails to parse.
 */
export async function getProblem(
  year: string,
  month: string,
  day: string,
  root: string = PROBLEMS_ROOT,
): Promise<Problem | null> {
  const date = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    return null;
  }

  try {
    const content = await fs.readFile(problemFilePath(date, root), "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Checks whether a problem file exists for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root directory.
 * @returns True when the file exists on disk.
 */
async function problemExists(date: string, root: string): Promise<boolean> {
  try {
    await fs.access(problemFilePath(date, root));
    return true;
  } catch {
    return false;
  }
}

/**
 * Looks up whether the days immediately before and after a date are
 * archived, for prev/next navigation.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root (defaults to `data/problems`).
 * @returns Each neighbor's `YYYY-MM-DD` when its problem file exists, null
 *   otherwise.
 */
export async function getAdjacentDates(
  date: string,
  root: string = PROBLEMS_ROOT,
): Promise<AdjacentDates> {
  const prevDate = shiftDateUTC(date, -1);
  const nextDate = shiftDateUTC(date, 1);

  const [prevExists, nextExists] = await Promise.all([
    problemExists(prevDate, root),
    problemExists(nextDate, root),
  ]);

  return {
    prev: prevExists ? prevDate : null,
    next: nextExists ? nextDate : null,
  };
}
