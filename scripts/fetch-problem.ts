import { listMissingDates } from "@/lib/archive";
import {
  fetchQuestionContent,
  resolveDailyChallenge,
  verifyAuthentication,
} from "@/lib/leetcode-api";
import { problemFilePath, writeJsonFile } from "@/lib/paths";
import { buildProblem } from "@/lib/problems";

const MISSING_FLAG = "--missing";

async function fetchProblem(targetDate: string | undefined): Promise<void> {
  const dailyQuestion = await resolveDailyChallenge(targetDate);

  if (!dailyQuestion) {
    throw new Error(
      `No daily challenge found${targetDate ? ` for date ${targetDate}` : ""}`,
    );
  }

  const { title, difficulty, titleSlug } = dailyQuestion.question;
  console.log(`Daily question: ${title} (${difficulty})`);

  console.log("Fetching question content...");
  const description = await fetchQuestionContent(titleSlug);

  const problem = buildProblem(dailyQuestion, description);
  const filePath = problemFilePath(problem.date);
  writeJsonFile(filePath, problem);
  console.log(`Successfully wrote data to ${filePath}`);
}

async function fetchMissingProblems(): Promise<boolean> {
  const missingDates = listMissingDates();

  if (missingDates.length === 0) {
    console.log("No missing days, nothing to fetch.");
    return true;
  }

  console.log(
    `Missing days (${missingDates.length}): ${missingDates.join(", ")}`,
  );

  const failedDates: string[] = [];

  for (const date of missingDates) {
    console.log(`\n=== ${date} ===`);
    try {
      await fetchProblem(date);
    } catch (error) {
      console.error(`Error fetching problem for ${date}:`, error);
      failedDates.push(date);
    }
  }

  if (failedDates.length > 0) {
    console.error(`\nCould not fetch: ${failedDates.join(", ")}`);
    return false;
  }

  return true;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const fetchMissing = args.includes(MISSING_FLAG);
    const targetDate = args.find((arg) => !arg.startsWith("--"));

    if (fetchMissing && targetDate !== undefined) {
      console.error(`${MISSING_FLAG} doesn't take a date, got "${targetDate}"`);
      process.exit(1);
    }

    console.log("Verifying authentication...");
    const username = await verifyAuthentication();
    console.log(`Authenticated as ${username}`);

    if (fetchMissing) {
      process.exit((await fetchMissingProblems()) ? 0 : 1);
    }

    await fetchProblem(targetDate);
    process.exit(0);
  } catch (error) {
    console.error("Error fetching daily problem:", error);
    process.exit(1);
  }
}

main();
