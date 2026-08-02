import { config } from "dotenv";
import type { Difficulty } from "./types";

config();

const LEETCODE_API_URL = "https://leetcode.com/graphql";

const SUBMISSION_PAGE_SIZE = 20;
const MAX_SUBMISSION_PAGES = 10;
const SUBMISSION_REQUEST_DELAY_MS = 200;

/**
 * Reads a required environment variable.
 *
 * @param name The variable name.
 * @returns The variable's value.
 * @throws When the variable is unset or empty.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} environment variable is not set. Add it to .env before running this script.`,
    );
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

/** Summary fields LeetCode returns for a question in challenge listings. */
export interface LeetCodeQuestionSummary {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
}

/** One daily challenge as returned by the daily and calendar queries. */
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
  data: { question: { content: string } | null };
}

/** One row of the authenticated user's submission list for a question. */
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

/** Detailed fields LeetCode returns for a single submission. */
export interface SubmissionDetails {
  runtimePercentile: number;
  memoryPercentile: number;
  code: string;
  timestamp: string;
  statusDisplay: string;
  lang: { name: string; verboseName: string };
}

interface SubmissionDetailsResponse {
  data: { submissionDetails: SubmissionDetails | null };
}

interface AuthResponse {
  data: { userStatus: { isSignedIn: boolean; username: string } };
}

interface GraphQLError {
  message: string;
}

/**
 * Resolves after a delay.
 *
 * @param ms The delay in milliseconds.
 * @returns A promise resolving after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds the authenticated request headers from the LeetCode session
 * cookies in the environment.
 *
 * @returns The headers for a LeetCode GraphQL request.
 * @throws When LEETCODE_SESSION or LEETCODE_CSRFTOKEN is unset.
 */
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

/**
 * Executes one authenticated GraphQL request against LeetCode.
 *
 * @param query The GraphQL query string.
 * @param variables The query variables.
 * @returns The parsed response typed as T.
 * @throws On a non-2xx HTTP status, on GraphQL errors in the response, or
 *   when the response carries neither data nor errors.
 */
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

  const json = (await response.json()) as T & {
    errors?: GraphQLError[];
    data?: unknown;
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (json.data == null) {
    throw new Error(
      "GraphQL response contained no data (and no errors) — the query may be malformed or the session invalid.",
    );
  }

  return json;
}

/**
 * Verifies that the configured session cookies are signed in.
 *
 * @returns The authenticated username.
 * @throws When the session is invalid or expired.
 */
export async function verifyAuthentication(): Promise<string> {
  const authData = await fetchLeetCode<AuthResponse>(AUTHENTICATION_QUERY);
  if (!authData.data.userStatus.isSignedIn) {
    console.warn(
      "Authentication failed: LEETCODE_SESSION or LEETCODE_CSRFTOKEN is invalid or expired.",
    );
    throw new Error("Authentication failed");
  }
  return authData.data.userStatus.username;
}

/**
 * Fetches the currently active daily challenge.
 *
 * @returns Today's daily challenge.
 */
export async function fetchTodayChallenge(): Promise<DailyChallenge> {
  console.log("Fetching today's daily challenge...");
  const dailyData = await fetchLeetCode<DailyQuestionResponse>(DAILY_QUERY);
  return dailyData.data.activeDailyCodingChallengeQuestion;
}

/**
 * Fetches the daily challenge for a specific date via that month's
 * challenge calendar.
 *
 * @param targetDate The day as `YYYY-MM-DD`.
 * @returns The challenge for that date, or undefined when the calendar has
 *   no entry for it.
 */
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

/**
 * Resolves a daily challenge with the shared date-argument semantics of the
 * fetch scripts: a given date goes through the month calendar, no date means
 * "today".
 *
 * @param targetDate The day as `YYYY-MM-DD`, or undefined for today.
 * @returns The challenge, or undefined when a given date has no entry.
 */
export async function resolveDailyChallenge(
  targetDate?: string,
): Promise<DailyChallenge | undefined> {
  return targetDate
    ? fetchChallengeForDate(targetDate)
    : fetchTodayChallenge();
}

/**
 * Fetches a question's description HTML.
 *
 * @param titleSlug The question slug, e.g. "stone-game".
 * @returns The raw description HTML.
 * @throws When no question exists for the slug.
 */
export async function fetchQuestionContent(titleSlug: string): Promise<string> {
  const contentData = await fetchLeetCode<ContentResponse>(CONTENT_QUERY, {
    titleSlug,
  });
  const question = contentData.data.question;
  if (!question) {
    throw new Error(`No question found for slug "${titleSlug}"`);
  }
  return question.content;
}

/**
 * Fetches every submission the authenticated user has ever made for a
 * question — not just the ones from the day it was the daily challenge.
 * Pagination stops after MAX_SUBMISSION_PAGES pages (currently 10 x 20 =
 * 200 submissions); anything older is left out with a warning.
 *
 * @param titleSlug The question slug.
 * @returns The submissions, newest first as returned by LeetCode.
 */
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

  if (hasNext) {
    console.warn(
      `Stopped after ${MAX_SUBMISSION_PAGES} pages (${submissions.length} submissions) for "${titleSlug}"; older submissions were not fetched.`,
    );
  }

  return submissions;
}

/**
 * Fetches the details of one submission.
 *
 * @param submissionId The submission's id.
 * @returns The submission details.
 * @throws When no details exist for the id.
 */
export async function fetchSubmissionDetails(
  submissionId: string,
): Promise<SubmissionDetails> {
  const detailsData = await fetchLeetCode<SubmissionDetailsResponse>(
    SUBMISSION_DETAILS_QUERY,
    { submissionId: parseInt(submissionId, 10) },
  );
  const details = detailsData.data.submissionDetails;
  if (!details) {
    throw new Error(`No details found for submission ${submissionId}`);
  }
  return details;
}

/**
 * Waits the standard delay between successive submission requests, to avoid
 * hammering the API.
 *
 * @returns A promise resolving after the delay.
 */
export async function throttleSubmissionRequest(): Promise<void> {
  await sleep(SUBMISSION_REQUEST_DELAY_MS);
}
