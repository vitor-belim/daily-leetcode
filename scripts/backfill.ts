import { collectFilledDates, getMissingDates } from "@/lib/archive";
import { isValidCalendarDate, todayUTC } from "@/lib/dates";
import {
  checkExplainerLogin,
  EXPLAINER_LOGIN_HINT,
  EXPLAINER_NAME,
  explainDate,
  isExplainComplete,
} from "@/lib/explainer";
import { solutionFileExists } from "@/lib/paths";
import { execFileSync } from "child_process";
import { config } from "dotenv";

config();

const FETCH_TIMEOUT_MS = 2 * 60 * 1000;

function fetchProblem(date: string) {
  console.log(`\n=== ${date}: fetch-problem ===`);
  execFileSync("npm", ["run", "fetch-problem", "--", date], {
    stdio: "inherit",
    timeout: FETCH_TIMEOUT_MS,
  });
}

function fetchSolution(date: string) {
  console.log(`\n=== ${date}: fetch-solution ===`);
  execFileSync("npm", ["run", "fetch-solution", "--", date], {
    stdio: "inherit",
    timeout: FETCH_TIMEOUT_MS,
  });
}

function parseFromArg(args: string[]): string | undefined {
  const inline = args.find((arg) => arg.startsWith("--from="));
  const separateIndex = args.indexOf("--from");
  const value = inline?.slice("--from=".length) ?? args[separateIndex + 1];

  if (inline === undefined && separateIndex === -1) return undefined;
  if (value === undefined || !isValidCalendarDate(value)) {
    console.error(`--from expects a YYYY-MM-DD date, got "${value ?? ""}"`);
    process.exit(1);
  }
  return value;
}

function main() {
  const from = parseFromArg(process.argv.slice(2));
  const filledDates = collectFilledDates();
  if (filledDates.length === 0 && from === undefined) {
    console.error(
      "No existing problem data found under data/problems. Run `npm run fetch-problem` manually to seed the first day, or pass --from YYYY-MM-DD.",
    );
    process.exit(1);
  }

  const lastFilled = filledDates.at(-1);
  console.log(`Last filled day: ${lastFilled ?? "none"}`);
  if (from !== undefined) console.log(`Scanning from: ${from}`);

  const missingDates = getMissingDates(filledDates, todayUTC(), from);
  const missingSet = new Set(missingDates);
  const incompleteDates = filledDates.filter(
    (date) => !isExplainComplete(date),
  );

  const datesToProcess = Array.from(
    new Set([...missingDates, ...incompleteDates]),
  ).sort();

  if (datesToProcess.length === 0) {
    console.log("Already up to date, nothing to backfill.");
    return;
  }

  console.log(
    `Dates needing work (${datesToProcess.length}): ${datesToProcess.join(", ")}`,
  );

  const failedDates = new Set<string>();
  let explainerLoginError: string | null | undefined;

  for (const date of datesToProcess) {
    if (missingSet.has(date)) {
      try {
        fetchProblem(date);
      } catch (error) {
        console.error(
          `\nfetch-problem failed for ${date}: ${(error as Error).message}`,
        );
        failedDates.add(date);
        continue;
      }
    }

    if (!solutionFileExists(date)) {
      try {
        fetchSolution(date);
      } catch (error) {
        console.error(
          `\nfetch-solution failed for ${date}: ${(error as Error).message}`,
        );
        failedDates.add(date);
        continue;
      }

      if (!solutionFileExists(date)) {
        console.log(`\n${date}: not solved yet, skipping explain.`);
        failedDates.add(date);
        continue;
      }
    }

    if (isExplainComplete(date)) {
      console.log(`\n${date}: no solutions to explain, skipping.`);
      continue;
    }

    if (explainerLoginError === undefined) {
      console.log(`\n=== checking ${EXPLAINER_NAME} login ===`);
      explainerLoginError = checkExplainerLogin();
      if (explainerLoginError !== null) {
        console.error(
          `\n${EXPLAINER_NAME} is not usable: ${explainerLoginError}`,
        );
      }
    }
    if (explainerLoginError !== null) {
      console.error(
        `\n${date}: skipping explain, ${EXPLAINER_NAME} is not usable.`,
      );
      failedDates.add(date);
      continue;
    }

    try {
      console.log(`\n=== explain: ${date} ===`);
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
    if (explainerLoginError !== undefined && explainerLoginError !== null) {
      console.error(EXPLAINER_LOGIN_HINT);
    }
    process.exit(1);
  }

  console.log("\nBackfill complete.");
}

main();
