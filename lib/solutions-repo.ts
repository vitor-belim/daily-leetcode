import fs from "node:fs/promises";
import type { Solution } from "./types";
import { solutionFilePath, SOLUTIONS_ROOT } from "./paths";
import { isValidCalendarDate } from "./dates";

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
