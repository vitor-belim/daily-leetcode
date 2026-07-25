import { Solution } from "@/lib/data";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config();

const LEETCODE_API_URL = "https://leetcode.com/graphql";

const SUBMISSION_PAGE_SIZE = 20;
const MAX_SUBMISSION_PAGES = 10;
const SUBMISSION_REQUEST_DELAY_MS = 200;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `${name} environment variable is not set. Add it to .env before running this script.`,
    );
    process.exit(1);
  }
  return value;
}

const LEETCODE_SESSION = requireEnv("LEETCODE_SESSION");
const LEETCODE_CSRFTOKEN = requireEnv("LEETCODE_CSRFTOKEN");

const DAILY_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        questionFrontendId
        title
        titleSlug
        difficulty
      }
    }
  }
`;

const CALENDAR_QUERY = `
  query dailyCodingChallengeV2($year: Int!, $month: Int!) {
    dailyCodingChallengeV2(year: $year, month: $month) {
      challenges {
        date
        link
        question {
          questionFrontendId
          title
          titleSlug
          difficulty
        }
      }
    }
  }
`;

const CONTENT_QUERY = `
  query questionContent($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      content
    }
  }
`;

const SUBMISSION_LIST_QUERY = `
  query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
    questionSubmissionList(
      offset: $offset
      limit: $limit
      lastKey: $lastKey
      questionSlug: $questionSlug
    ) {
      lastKey
      hasNext
      submissions {
        id
        statusDisplay
        lang
        runtime
        memory
        timestamp
        url
      }
    }
  }
`;

const SUBMISSION_DETAILS_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtimePercentile
      memoryPercentile
      code
      timestamp
      statusDisplay
      lang {
        name
        verboseName
      }
    }
  }
`;

const AUTHENTICATION_QUERY = `
  query globalData {
    userStatus {
      isSignedIn
      username
    }
  }
`;

interface LeetCodeQuestionSummary {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface DailyChallenge {
  date: string;
  link: string;
  question: LeetCodeQuestionSummary;
}

interface DailyQuestionResponse {
  data: { activeDailyCodingChallengeQuestion: DailyChallenge };
}

interface CalendarResponse {
  data: { dailyCodingChallengeV2: { challenges: DailyChallenge[] } };
}

interface ContentResponse {
  data: { question: { content: string } };
}

interface SubmissionListItem {
  id: string;
  statusDisplay: string;
  lang: string;
  runtime: string;
  memory: string;
  timestamp: string;
  url: string;
}

interface SubmissionListResponse {
  data: {
    questionSubmissionList: {
      lastKey: string | null;
      hasNext: boolean;
      submissions: SubmissionListItem[];
    };
  };
}

interface SubmissionDetailsResponse {
  data: {
    submissionDetails: {
      runtimePercentile: number;
      memoryPercentile: number;
      code: string;
      timestamp: string;
      statusDisplay: string;
      lang: { name: string; verboseName: string };
    };
  };
}

interface AuthResponse {
  data: { userStatus: { isSignedIn: boolean; username: string } };
}

interface GraphQLError {
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLeetCode<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${LEETCODE_CSRFTOKEN}`,
    "x-csrftoken": LEETCODE_CSRFTOKEN,
    Referer: "https://leetcode.com",
  };

  const response = await fetch(LEETCODE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status} ${bodyText.slice(0, 500)}`,
    );
  }

  const json = (await response.json()) as T & { errors?: GraphQLError[] };

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return json;
}

async function fetchTodayChallenge(): Promise<DailyChallenge> {
  console.log("Fetching today's daily challenge...");
  const dailyData = await fetchLeetCode<DailyQuestionResponse>(DAILY_QUERY);
  return dailyData.data.activeDailyCodingChallengeQuestion;
}

async function fetchChallengeForDate(
  targetDate: string,
): Promise<DailyChallenge | undefined> {
  console.log(`Fetching challenge for date: ${targetDate}...`);
  const [year, month] = targetDate.split("-").map(Number);
  const calendarData = await fetchLeetCode<CalendarResponse>(CALENDAR_QUERY, {
    year,
    month,
  });
  return calendarData.data.dailyCodingChallengeV2.challenges.find(
    (c) => c.date === targetDate,
  );
}

async function fetchAllSubmissions(
  titleSlug: string,
): Promise<SubmissionListItem[]> {
  const submissions: SubmissionListItem[] = [];
  let offset = 0;
  let lastKey: string | null = null;
  let hasNext = true;
  let page = 0;

  while (hasNext && page < MAX_SUBMISSION_PAGES) {
    const data: SubmissionListResponse = await fetchLeetCode<SubmissionListResponse>(
      SUBMISSION_LIST_QUERY,
      { offset, limit: SUBMISSION_PAGE_SIZE, lastKey, questionSlug: titleSlug },
    );

    const list: SubmissionListResponse["data"]["questionSubmissionList"] =
      data.data.questionSubmissionList;
    submissions.push(...list.submissions);
    hasNext = list.hasNext;
    lastKey = list.lastKey;
    offset += SUBMISSION_PAGE_SIZE;
    page += 1;

    if (hasNext) {
      await sleep(SUBMISSION_REQUEST_DELAY_MS);
    }
  }

  return submissions;
}

function statusFromDisplay(statusDisplay: string): Solution["status"] {
  switch (statusDisplay) {
    case "Accepted":
      return "DONE";
    case "Time Limit Exceeded":
      return "TLE";
    case "Memory Limit Exceeded":
      return "MLE";
    default:
      return "FAILED";
  }
}

function score(solution: Solution): number {
  return (solution.cpuUsage || 0) + (solution.memoryUsage || 0);
}

async function main() {
  try {
    console.log("Verifying authentication...");
    const authData = await fetchLeetCode<AuthResponse>(AUTHENTICATION_QUERY);
    if (!authData.data.userStatus.isSignedIn) {
      console.warn(
        "Authentication failed: LEETCODE_SESSION or LEETCODE_CSRFTOKEN is invalid or expired.",
      );
      // noinspection ExceptionCaughtLocallyJS
      throw new Error("Authentication failed");
    }
    console.log(`Authenticated as ${authData.data.userStatus.username}`);

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
    const contentData = await fetchLeetCode<ContentResponse>(CONTENT_QUERY, {
      titleSlug,
    });
    const description = contentData.data.question.content;

    const problemData = {
      title,
      difficulty,
      description,
      link,
      date,
    };

    const [year, month, day] = date.split("-");
    const dirPath = path.join(process.cwd(), "data", "problems", year, month);
    const filePath = path.join(dirPath, `${day}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(problemData, null, 2));
    console.log(`Successfully wrote data to ${filePath}`);

    const solutionsDirPath = path.join(
      process.cwd(),
      "data",
      "solutions",
      year,
      month,
    );
    const solutionsFilePath = path.join(solutionsDirPath, `${day}.json`);

    if (fs.existsSync(solutionsFilePath)) {
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

    const solutionsMap = new Map<string, Solution>();

    for (const sub of submissions) {
      console.log(`Fetching details for submission: ${sub.id}`);
      const detailsData = await fetchLeetCode<SubmissionDetailsResponse>(
        SUBMISSION_DETAILS_QUERY,
        { submissionId: parseInt(sub.id, 10) },
      );
      const details = detailsData.data.submissionDetails;

      const candidate: Solution = {
        author: process.env.LEETCODE_USERNAME || "Vitor",
        code: details.code,
        language: details.lang.name,
        notes: "",
        aiExplanation: "",
        status: statusFromDisplay(details.statusDisplay),
        cpuUsage: Math.round(details.runtimePercentile * 100) / 100,
        memoryUsage: Math.round(details.memoryPercentile * 100) / 100,
        date: new Date(parseInt(sub.timestamp, 10) * 1000).toISOString(),
      };

      const existing = solutionsMap.get(candidate.code);
      if (!existing || score(candidate) > score(existing)) {
        solutionsMap.set(candidate.code, candidate);
      }

      await sleep(SUBMISSION_REQUEST_DELAY_MS);
    }

    const fetchedSolutions = Array.from(solutionsMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    if (!fs.existsSync(solutionsDirPath)) {
      fs.mkdirSync(solutionsDirPath, { recursive: true });
    }

    fs.writeFileSync(
      solutionsFilePath,
      JSON.stringify(fetchedSolutions, null, 2),
    );
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
