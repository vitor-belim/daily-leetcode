import { collectFilledDates, getMissingDates } from "@/lib/archive";
import { solutionFileExists, solutionFilePath } from "@/lib/paths";
import type { Solution } from "@/lib/types";
import { execFileSync } from "child_process";
import fs from "fs";

const FETCH_TIMEOUT_MS = 2 * 60 * 1000;
const EXPLAIN_TIMEOUT_MS = 10 * 60 * 1000;

function fetchDate(date: string) {
  console.log(`\n=== ${date}: fetch-daily ===`);
  execFileSync("npm", ["run", "fetch-daily", "--", date], {
    stdio: "inherit",
    timeout: FETCH_TIMEOUT_MS,
  });
}

function explainDate(date: string) {
  console.log(`\n=== explain: ${date} ===`);
  execFileSync(
    "claude",
    ["-p", `/explain ${date}`, "--permission-mode", "acceptEdits"],
    { stdio: "inherit", timeout: EXPLAIN_TIMEOUT_MS },
  );
}

function isExplainComplete(date: string): boolean {
  if (!solutionFileExists(date)) return false;

  try {
    const solutions: Solution[] = JSON.parse(
      fs.readFileSync(solutionFilePath(date), "utf8"),
    );
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

  console.log(
    `Missing days (${missingDates.length}): ${missingDates.join(", ")}`,
  );

  const failedDates = new Set<string>();

  for (const date of missingDates) {
    try {
      fetchDate(date);
    } catch (error) {
      console.error(
        `\nfetch-daily failed for ${date}: ${(error as Error).message}`,
      );
      failedDates.add(date);
      continue;
    }

    if (!solutionFileExists(date)) {
      console.log(`\n${date}: no solutions file yet, skipping explain.`);
      failedDates.add(date);
      continue;
    }

    try {
      explainDate(date);
    } catch (error) {
      console.error(
        `\nexplain failed for ${date}: ${(error as Error).message}`,
      );
      failedDates.add(date);
      continue;
    }

    if (!isExplainComplete(date)) {
      console.error(`\nexplain did not produce explanations for ${date}`);
      failedDates.add(date);
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
