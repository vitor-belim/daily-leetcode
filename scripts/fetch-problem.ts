import { problemFilePath, writeJsonFile } from "@/lib/paths";
import {
  verifyAuthentication,
  resolveDailyChallenge,
  fetchQuestionContent,
} from "@/lib/leetcode-api";
import { buildProblem } from "@/lib/problems";

async function main() {
  try {
    console.log("Verifying authentication...");
    const username = await verifyAuthentication();
    console.log(`Authenticated as ${username}`);

    const args = process.argv.slice(2);
    const targetDate = args.find((arg) => !arg.startsWith("--")); // Format: YYYY-MM-DD

    const dailyQuestion = await resolveDailyChallenge(targetDate);

    if (!dailyQuestion) {
      // noinspection ExceptionCaughtLocallyJS
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

    process.exit(0);
  } catch (error) {
    console.error("Error fetching daily problem:", error);
    process.exit(1);
  }
}

main();
