import "server-only";
import fs from "node:fs/promises";
import { cache } from "react";
import { parseProblem } from "./archive-schema";
import type { Problem } from "./types";
import { problemFilePath, PROBLEMS_ROOT } from "./paths";
import { isValidCalendarDate, shiftDateUTC } from "./dates";
import { isMissingFileError } from "./fs-errors";

/** The archived days directly before and after a date, when they exist. */
export interface AdjacentDates {
  prev: string | null;
  next: string | null;
}

/**
 * Reads, parses and validates one problem file without validating the date,
 * for callers that already hold a date from the archive scan.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The validated problem, or null when the file does not exist.
 * @throws When the file exists but cannot be read (`EACCES`, `EISDIR`, ...),
 *   fails to parse (`SyntaxError`) or holds the wrong shape (`TypeError`,
 *   see {@link parseProblem}), so a corrupted archive reaches an error
 *   boundary or fails the build instead of passing for a missing day.
 */
export async function readProblemFile(
  date: string,
  root: string = PROBLEMS_ROOT,
): Promise<Problem | null> {
  const filePath = problemFilePath(date, root);
  try {
    const content = await fs.readFile(filePath, "utf8");
    const value: unknown = JSON.parse(content);
    return parseProblem(value, filePath);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

/**
 * Reads one day's archived problem, validating the date first so URL
 * segments can be passed straight in. Wrapped in React's `cache()`, so it is
 * memoized per server request: the blog page and its `generateMetadata` share
 * a single read per set of arguments. The Open Graph image is its own Route
 * Handler request and reads once on its own. Outside a React server render
 * it simply calls through.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The problem, or null when the date is invalid or the file is
 *   missing.
 * @throws When the file exists but cannot be read, fails to parse or holds
 *   the wrong shape.
 */
export const getProblem = cache(async function getProblem(
  year: string,
  month: string,
  day: string,
  root: string = PROBLEMS_ROOT,
): Promise<Problem | null> {
  const date = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    return null;
  }

  return readProblemFile(date, root);
});

/**
 * Checks whether a problem file exists for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root directory.
 * @returns True when the file exists on disk, false when it is missing.
 * @throws When the existence check fails for any reason other than the file
 *   being missing.
 */
async function problemExists(date: string, root: string): Promise<boolean> {
  try {
    await fs.access(problemFilePath(date, root));
    return true;
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
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
 * @throws When either existence check fails for a reason other than the
 *   file being missing.
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
