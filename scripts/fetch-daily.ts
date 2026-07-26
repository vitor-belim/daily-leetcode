import type { Solution } from "@/lib/types";
import {
  problemFilePath,
  solutionFileExists,
  solutionFilePath,
  writeJsonFile,
} from "@/lib/paths";
import {
  verifyAuthentication,
  fetchTodayChallenge,
  fetchChallengeForDate,
  fetchQuestionContent,
  fetchAllSubmissions,
  fetchSubmissionDetails,
  throttleSubmissionRequest,
} from "@/lib/leetcode-api";
import { buildSolution, dedupeSolutions } from "@/lib/solutions";

async function main() {
  try {
    console.log("Verifying authentication...");
    const username = await verifyAuthentication();
    console.log(`Authenticated as ${username}`);

    const args = process.argv.slice(2);
    const targetDate = args[0]; // Format: YYYY-MM-DD

    const dailyQuestion = targetDate
      ? await fetchChallengeForDate(targetDate)
      : await fetchTodayChallenge();

    if (!dailyQuestion) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        `No daily challenge found${targetDate ? ` for date ${targetDate}` : ""}`,
      );
    }

    const { date, question } = dailyQuestion;
    const { title, titleSlug, difficulty } = question;
    const link = dailyQuestion.link.startsWith("http")
      ? dailyQuestion.link
      : `https://leetcode.com${dailyQuestion.link}`;

    console.log(`Daily question: ${title} (${difficulty})`);

    console.log("Fetching question content...");
    const description = await fetchQuestionContent(titleSlug);

    const problemData = {
      title,
      difficulty,
      description,
      link,
      date,
    };

    const filePath = problemFilePath(date);
    writeJsonFile(filePath, problemData);
    console.log(`Successfully wrote data to ${filePath}`);

    const solutionsFilePath = solutionFilePath(date);

    if (solutionFileExists(date)) {
      console.log(`Solutions file already exists at ${solutionsFilePath}`);
      process.exit(0);
    }

    console.log("Fetching your submissions for this question...");
    const submissions = await fetchAllSubmissions(titleSlug);

    if (submissions.length === 0) {
      console.log(
        "No submissions found yet for this question; skipping solutions file so this day is retried on the next run.",
      );
      process.exit(0);
    }

    console.log(`Found ${submissions.length} submissions.`);

    const candidates: Solution[] = [];

    for (const sub of submissions) {
      console.log(`Fetching details for submission: ${sub.id}`);
      const details = await fetchSubmissionDetails(sub.id);
      candidates.push(buildSolution(sub, details));
      await throttleSubmissionRequest();
    }

    const fetchedSolutions = dedupeSolutions(candidates);

    writeJsonFile(solutionsFilePath, fetchedSolutions);
    console.log(
      `Successfully created solutions file with ${fetchedSolutions.length} fetched submissions at ${solutionsFilePath}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    process.exit(1);
  }
}

main();
