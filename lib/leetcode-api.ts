import { config } from "dotenv";

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

export interface LeetCodeQuestionSummary {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface DailyChallenge {
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

export interface SubmissionListItem {
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

export interface SubmissionDetails {
  runtimePercentile: number;
  memoryPercentile: number;
  code: string;
  timestamp: string;
  statusDisplay: string;
  lang: { name: string; verboseName: string };
}

interface SubmissionDetailsResponse {
  data: { submissionDetails: SubmissionDetails };
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

function buildHeaders(): Record<string, string> {
  const session = requireEnv("LEETCODE_SESSION");
  const csrfToken = requireEnv("LEETCODE_CSRFTOKEN");

  return {
    "Content-Type": "application/json",
    Cookie: `LEETCODE_SESSION=${session}; csrftoken=${csrfToken}`,
    "x-csrftoken": csrfToken,
    Referer: "https://leetcode.com",
  };
}

async function fetchLeetCode<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(LEETCODE_API_URL, {
    method: "POST",
    headers: buildHeaders(),
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

export async function verifyAuthentication(): Promise<string> {
  const authData = await fetchLeetCode<AuthResponse>(AUTHENTICATION_QUERY);
  if (!authData.data.userStatus.isSignedIn) {
    console.warn(
      "Authentication failed: LEETCODE_SESSION or LEETCODE_CSRFTOKEN is invalid or expired.",
    );
    // noinspection ExceptionCaughtLocallyJS
    throw new Error("Authentication failed");
  }
  return authData.data.userStatus.username;
}

export async function fetchTodayChallenge(): Promise<DailyChallenge> {
  console.log("Fetching today's daily challenge...");
  const dailyData = await fetchLeetCode<DailyQuestionResponse>(DAILY_QUERY);
  return dailyData.data.activeDailyCodingChallengeQuestion;
}

export async function fetchChallengeForDate(
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

// Both fetch scripts take an optional date argument with the same meaning:
// a given date goes through the month calendar, no date means "today".
export async function resolveDailyChallenge(
  targetDate?: string,
): Promise<DailyChallenge | undefined> {
  return targetDate
    ? fetchChallengeForDate(targetDate)
    : fetchTodayChallenge();
}

export async function fetchQuestionContent(titleSlug: string): Promise<string> {
  const contentData = await fetchLeetCode<ContentResponse>(CONTENT_QUERY, {
    titleSlug,
  });
  return contentData.data.question.content;
}

export async function fetchAllSubmissions(
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

export async function fetchSubmissionDetails(
  submissionId: string,
): Promise<SubmissionDetails> {
  const detailsData = await fetchLeetCode<SubmissionDetailsResponse>(
    SUBMISSION_DETAILS_QUERY,
    { submissionId: parseInt(submissionId, 10) },
  );
  return detailsData.data.submissionDetails;
}

export async function throttleSubmissionRequest(): Promise<void> {
  await sleep(SUBMISSION_REQUEST_DELAY_MS);
}
