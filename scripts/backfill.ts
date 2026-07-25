import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import type { Solution } from "@/lib/data";

const problemsRoot = path.join(process.cwd(), "data", "problems");
const EXPLAIN_BATCH_SIZE = 4;
const FETCH_TIMEOUT_MS = 2 * 60 * 1000;
const EXPLAIN_TIMEOUT_MS = 10 * 60 * 1000;

function isValidCalendarDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function collectFilledDates(): string[] {
  if (!fs.existsSync(problemsRoot)) return [];

  const dates: string[] = [];
  const years = fs.readdirSync(problemsRoot).filter((y) => /^\d{4}$/.test(y));

  for (const year of years) {
    const yearDir = path.join(problemsRoot, year);
    const months = fs
      .readdirSync(yearDir)
      .filter((m) => /^(0[1-9]|1[0-2])$/.test(m));

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const days = fs
        .readdirSync(monthDir)
        .filter((f) => /^\d{2}\.json$/.test(f))
        .map((f) => f.slice(0, 2));

      for (const day of days) {
        const dateStr = `${year}-${month}-${day}`;
        if (isValidCalendarDate(dateStr)) {
          dates.push(dateStr);
        }
      }
    }
  }

  return dates.sort();
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function getMissingDates(filledDates: string[]): string[] {
  const filledSet = new Set(filledDates);
  const cursor = parseDateUTC(filledDates[0]);
  const end = todayUTC();

  const missingDates: string[] = [];
  while (cursor <= end) {
    const dateStr = formatDateUTC(cursor);
    if (!filledSet.has(dateStr)) {
      missingDates.push(dateStr);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return missingDates;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function fetchDate(date: string) {
  console.log(`\n=== ${date}: fetch-daily ===`);
  execFileSync("npm", ["run", "fetch-daily", "--", date], {
    stdio: "inherit",
    timeout: FETCH_TIMEOUT_MS,
  });
}

function explainDates(dates: string[]) {
  console.log(`\n=== explain: ${dates.join(", ")} ===`);
  execFileSync(
    "claude",
    ["-p", `/explain ${dates.join(" ")}`, "--permission-mode", "acceptEdits"],
    { stdio: "inherit", timeout: EXPLAIN_TIMEOUT_MS },
  );
}

function solutionsFilePath(date: string): string {
  const [y, m, d] = date.split("-");
  return path.join(process.cwd(), "data", "solutions", y, m, `${d}.json`);
}

function isExplainComplete(date: string): boolean {
  const filePath = solutionsFilePath(date);
  if (!fs.existsSync(filePath)) return false;

  try {
    const solutions: Solution[] = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return (
      solutions.length > 0 &&
      solutions.every((s) => (s.aiExplanation || "").trim().length > 0)
    );
  } catch {
    return false;
  }
}

function main() {
  const filledDates = collectFilledDates();
  if (filledDates.length === 0) {
    console.error(
      "No existing problem data found under data/problems. Run `npm run fetch-daily` manually to seed the first day.",
    );
    process.exit(1);
  }

  const lastFilled = filledDates.at(-1) as string;
  console.log(`Last filled day: ${lastFilled}`);

  const missingDates = getMissingDates(filledDates);

  if (missingDates.length === 0) {
    console.log("Already up to date, nothing to backfill.");
    return;
  }

  console.log(`Missing days (${missingDates.length}): ${missingDates.join(", ")}`);

  const fetchedDates: string[] = [];
  const failedDates = new Set<string>();

  for (const date of missingDates) {
    try {
      fetchDate(date);
      fetchedDates.push(date);
    } catch (error) {
      console.error(`\nfetch-daily failed for ${date}: ${(error as Error).message}`);
      failedDates.add(date);
    }
  }

  if (fetchedDates.length === 0) {
    console.error("\nNo days were fetched successfully, skipping explain step.");
    process.exit(1);
  }

  for (const batch of chunk(fetchedDates, EXPLAIN_BATCH_SIZE)) {
    try {
      explainDates(batch);
    } catch (error) {
      console.error(
        `\nexplain failed for ${batch.join(", ")}: ${(error as Error).message}`,
      );
      for (const date of batch) failedDates.add(date);
      continue;
    }

    for (const date of batch) {
      if (!isExplainComplete(date)) {
        console.error(`\nexplain did not produce explanations for ${date}`);
        failedDates.add(date);
      }
    }
  }

  if (failedDates.size > 0) {
    console.error(
      `\nBackfill incomplete: issues with ${Array.from(failedDates).sort().join(", ")}`,
    );
    process.exit(1);
  }

  console.log("\nBackfill complete.");
}

main();
