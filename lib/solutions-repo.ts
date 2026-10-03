import "server-only";
import fs from "node:fs/promises";
import { cache } from "react";
import { parseSolutions } from "./archive-schema";
import type { Solution } from "./types";
import { solutionFilePath, SOLUTIONS_ROOT } from "./paths";
import { isValidCalendarDate } from "./dates";
import { isMissingFileError } from "./fs-errors";

/**
 * Reads the archived solutions for one `YYYY-MM-DD` day without validating
 * the date, for callers that already hold a date from the archive scan. A
 * missing file is kept apart from an empty one: no file means the day's
 * solutions have not been fetched yet, while a file holding `[]` records
 * that nothing was submitted.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's validated solutions sorted newest-first; null when the
 *   file does not exist; empty when the file holds an empty array.
 * @throws When the file exists but cannot be read (`EACCES`, `EISDIR`, ...),
 *   fails to parse (`SyntaxError`) or holds the wrong shape (`TypeError`,
 *   see {@link parseSolutions}), so a corrupted archive reaches an error
 *   boundary or fails the build instead of passing for a day with no
 *   submissions.
 */
export async function readSolutionsFile(
  date: string,
  root: string = SOLUTIONS_ROOT,
): Promise<Solution[] | null> {
  const filePath = solutionFilePath(date, root);
  try {
    const content = await fs.readFile(filePath, "utf8");
    const value: unknown = JSON.parse(content);
    return parseSolutions(value, filePath).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

/**
 * Reads the archived solutions for one day, validating the date first so URL
 * segments can be passed straight in. Wrapped in React's `cache()`, so it is
 * memoized per server request: every call with the same arguments within one
 * render shares a single read, and so the same array, which callers must not
 * mutate. Outside a React server render it simply calls through.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's solutions sorted newest-first; null when the date is
 *   invalid or has no solutions file; empty when the file holds an empty
 *   array.
 * @throws When the file exists but cannot be read, fails to parse or holds
 *   the wrong shape.
 */
export const getSolutions = cache(async function getSolutions(
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
});
