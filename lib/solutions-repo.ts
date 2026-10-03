import fs from "node:fs/promises";
import type { Solution } from "./types";
import { solutionFilePath, SOLUTIONS_ROOT } from "./paths";
import { isValidCalendarDate } from "./dates";

/**
 * Tells whether a failed read failed because the file does not exist.
 *
 * @param error The value caught from the failed read.
 * @returns True for an `ENOENT` filesystem error.
 */
function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * Reads the archived solutions for one `YYYY-MM-DD` day without validating
 * the date, for callers that already hold a date from the archive scan. A
 * missing file is kept apart from an empty one: no file means the day's
 * solutions have not been fetched yet, while an empty file records that
 * nothing was submitted.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's solutions sorted newest-first; null when the file does
 *   not exist; empty when the file is empty or fails to parse.
 */
export async function readSolutionsFile(
  date: string,
  root: string = SOLUTIONS_ROOT,
): Promise<Solution[] | null> {
  try {
    const content = await fs.readFile(solutionFilePath(date, root), "utf8");
    const solutions: Solution[] = JSON.parse(content);
    return solutions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch (error) {
    return isMissingFileError(error) ? null : [];
  }
}

/**
 * Reads the archived solutions for one day.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's solutions sorted newest-first; null when the date is
 *   invalid or has no solutions file; empty when the file is empty or fails
 *   to parse.
 */
export async function getSolutions(
  year: string,
  month: string,
  day: string,
  root: string = SOLUTIONS_ROOT,
): Promise<Solution[] | null> {
  const date = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    return null;
  }

  return readSolutionsFile(date, root);
}
