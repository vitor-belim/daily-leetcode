import { formatDateUTC, isPastDateUTC, todayUTC } from "@/lib/dates";
import {
  fetchAllSubmissions,
  fetchSubmissionDetails,
  resolveDailyChallenge,
  throttleSubmissionRequest,
  verifyAuthentication,
} from "@/lib/leetcode-api";
import {
  problemFilePath,
  solutionFileExists,
  solutionFilePath,
  writeJsonFile,
} from "@/lib/paths";
import { titleSlugFromLink } from "@/lib/problems";
import { buildSolution, dedupeSolutions } from "@/lib/solutions";
import type { Problem, Solution } from "@/lib/types";
import fs from "fs";

interface Target {
  date: string;
  titleSlug: string;
}

function slugFromProblemFile(date: string): string | null {
  try {
    const problem: Problem = JSON.parse(
      fs.readFileSync(problemFilePath(date), "utf8"),
    );
    return titleSlugFromLink(problem.link);
  } catch {
    return null;
  }
}

async function resolveTarget(
  targetDate: string | undefined,
): Promise<Target | null> {
  const date = targetDate ?? formatDateUTC(todayUTC());
  const titleSlug = slugFromProblemFile(date);

  if (titleSlug) {
    return { date, titleSlug };
  }

  const dailyQuestion = await resolveDailyChallenge(targetDate);
  if (!dailyQuestion) {
    return null;
  }

  return {
    date: dailyQuestion.date,
    titleSlug: dailyQuestion.question.titleSlug,
  };
}

async function main() {
  try {
    console.log("Verifying authentication...");
    const username = await verifyAuthentication();
    console.log(`Authenticated as ${username}`);

    const args = process.argv.slice(2);
    const targetDate = args.find((arg) => !arg.startsWith("--"));

    const target = await resolveTarget(targetDate);

    if (!target) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        `No daily challenge found${targetDate ? ` for date ${targetDate}` : ""}`,
      );
    }

    const { date, titleSlug } = target;
    const solutionsFilePath = solutionFilePath(date);

    if (solutionFileExists(date)) {
      console.log(`Solutions file already exists at ${solutionsFilePath}`);
      process.exit(0);
    }

    console.log(`Fetching your submissions for ${titleSlug} (${date})...`);
    const submissions = await fetchAllSubmissions(titleSlug);

    if (submissions.length === 0) {
      if (isPastDateUTC(date)) {
        writeJsonFile(solutionsFilePath, []);
        console.log(
          `No submissions found for ${date} and the day is over; wrote an empty solutions file at ${solutionsFilePath}.`,
        );
        process.exit(0);
      }

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
    console.error("Error fetching daily solutions:", error);
    process.exit(1);
  }
}

main();
