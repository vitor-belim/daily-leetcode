import fs from "fs";
import path from "path";

export const PROBLEMS_ROOT = path.join(process.cwd(), "data", "problems");
export const SOLUTIONS_ROOT = path.join(process.cwd(), "data", "solutions");

/**
 * Builds the `<root>/YYYY/MM/DD.json` path for a date.
 *
 * @param root The archive root directory.
 * @param date The day as `YYYY-MM-DD`.
 * @returns The absolute file path for that day.
 * @throws When `date` is not shaped like `YYYY-MM-DD`.
 */
function datePartsToPath(root: string, date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    throw new Error(`Invalid date "${date}"; expected YYYY-MM-DD`);
  }
  return path.join(root, year, month, `${day}.json`);
}

/**
 * Resolves the problem file path for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The absolute path of `data/problems/YYYY/MM/DD.json`.
 */
export function problemFilePath(date: string, root: string = PROBLEMS_ROOT): string {
  return datePartsToPath(root, date);
}

/**
 * Resolves the solutions file path for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns The absolute path of `data/solutions/YYYY/MM/DD.json`.
 */
export function solutionFilePath(date: string, root: string = SOLUTIONS_ROOT): string {
  return datePartsToPath(root, date);
}

/**
 * Checks whether a solutions file already exists for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns True when the file exists on disk.
 */
export function solutionFileExists(date: string, root: string = SOLUTIONS_ROOT): boolean {
  return fs.existsSync(solutionFilePath(date, root));
}

/**
 * Writes a value as pretty-printed JSON, creating parent directories as
 * needed.
 *
 * @param filePath The destination file path.
 * @param value The value to serialize.
 */
export function writeJsonFile(filePath: string, value: unknown): void {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}
