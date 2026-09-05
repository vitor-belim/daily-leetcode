import fs from "node:fs/promises";
import type { Solution } from "./types";
import { solutionFilePath, SOLUTIONS_ROOT } from "./paths";
import { isValidCalendarDate } from "./dates";

/**
 * Reads the archived solutions for one `YYYY-MM-DD` day without validating
 * the date, for callers that already hold a date from the archive scan.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's solutions sorted newest-first; empty when the file is
 *   missing or fails to parse.
 */
export async function readSolutionsFile(
  date: string,
  root: string = SOLUTIONS_ROOT,
): Promise<Solution[]> {
  try {
    const content = await fs.readFile(solutionFilePath(date, root), "utf8");
    const solutions: Solution[] = JSON.parse(content);
    return solutions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Reads the archived solutions for one day.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The day's solutions sorted newest-first; empty when the date is
 *   invalid, the file is missing, or it fails to parse.
 */
export async function getSolutions(
  year: string,
  month: string,
  day: string,
  root: string = SOLUTIONS_ROOT,
): Promise<Solution[]> {
  const date = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    return [];
  }

  return readSolutionsFile(date, root);
}
