import fs from "fs";
import path from "path";

export const PROBLEMS_ROOT = path.join(process.cwd(), "data", "problems");
export const SOLUTIONS_ROOT = path.join(process.cwd(), "data", "solutions");

function datePartsToPath(root: string, date: string): string {
  const [year, month, day] = date.split("-");
  return path.join(root, year, month, `${day}.json`);
}

export function problemFilePath(date: string, root: string = PROBLEMS_ROOT): string {
  return datePartsToPath(root, date);
}

export function solutionFilePath(date: string, root: string = SOLUTIONS_ROOT): string {
  return datePartsToPath(root, date);
}

export function solutionFileExists(date: string, root: string = SOLUTIONS_ROOT): boolean {
  return fs.existsSync(solutionFilePath(date, root));
}

export function writeJsonFile(filePath: string, value: unknown): void {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}
