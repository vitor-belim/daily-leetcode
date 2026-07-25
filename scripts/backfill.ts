import fs from "fs";
import { execFileSync } from "child_process";
import type { Solution } from "@/lib/types";
import { solutionFilePath } from "@/lib/paths";
import { collectFilledDates, getMissingDates } from "@/lib/archive";

const EXPLAIN_BATCH_SIZE = 4;
const FETCH_TIMEOUT_MS = 2 * 60 * 1000;
const EXPLAIN_TIMEOUT_MS = 10 * 60 * 1000;

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

function isExplainComplete(date: string): boolean {
  const filePath = solutionFilePath(date);
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
