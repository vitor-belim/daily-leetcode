import { config } from "dotenv";
import fs from "fs";
import path from "path";

config();

const LEETCODE_API_URL = "https://leetcode.com/graphql";
const LEETCODE_SESSION = process.env.LEETCODE_SESSION;
const LEETCODE_CSRFTOKEN = process.env.LEETCODE_CSRFTOKEN;

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

async function fetchLeetCode(query: string, variables: unknown = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (LEETCODE_SESSION && LEETCODE_CSRFTOKEN) {
    headers["Cookie"] =
      `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${LEETCODE_CSRFTOKEN}`;
    headers["x-csrftoken"] = LEETCODE_CSRFTOKEN;
    headers["Referer"] = "https://leetcode.com";
  }

  const response = await fetch(LEETCODE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${JSON.stringify(await response.json())}`,
    );
  }

  return response.json();
}

async function generateExplanation(id: string, code: string) {
  // Generate explanation using AI prompt
  console.log(`Generating explanation for submission ${id}...`);
  let explanation = "";

  try {
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
      });
      const prompt = `explain the following code in a simple way, using a single paragraph: \n\n${code}`;
      const result = await model.generateContent(prompt);
      explanation = result.response.text().trim();
    } else {
      console.warn(
        "GEMINI_API_KEY not found. Skipping explanation generation.",
      );
    }
  } catch (e) {
    console.error("Failed to generate explanation:", e);
  }

  return explanation;
}

async function main() {
  try {
    console.log("Verifying authentication...");
    const authData = await fetchLeetCode(AUTHENTICATION_QUERY);
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

    let dailyQuestion;

    if (targetDate) {
      console.log(`Fetching challenge for date: ${targetDate}...`);
      const [year, month] = targetDate.split("-").map(Number);
      const calendarData = await fetchLeetCode(CALENDAR_QUERY, { year, month });
      const challenges: { date: string }[] =
        calendarData.data.dailyCodingChallengeV2.challenges;
      dailyQuestion = challenges.find((c) => c.date === targetDate);
    } else {
      console.log("Fetching today's daily challenge...");
      const dailyData = await fetchLeetCode(DAILY_QUERY);
      dailyQuestion = dailyData.data.activeDailyCodingChallengeQuestion;
    }

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
    const contentData = await fetchLeetCode(CONTENT_QUERY, { titleSlug });
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

    if (!fs.existsSync(solutionsDirPath)) {
      fs.mkdirSync(solutionsDirPath, { recursive: true });
    }

    if (!fs.existsSync(solutionsFilePath)) {
      let fetchedSolutions = [];

      console.log("Fetching your submissions for this question...");
      const submissionListData = await fetchLeetCode(SUBMISSION_LIST_QUERY, {
        offset: 0,
        limit: 20,
        questionSlug: titleSlug,
      });
      console.log(submissionListData);

      const submissions =
        submissionListData.data.questionSubmissionList.submissions;

      if (submissions.length > 0) {
        console.log(`Found ${submissions.length} submissions.`);

        const solutionsMap = new Map();

        for (const sub of submissions) {
          console.log(`Fetching details for submission: ${sub.id}`);
          const detailsData = await fetchLeetCode(SUBMISSION_DETAILS_QUERY, {
            submissionId: parseInt(sub.id),
          });
          const details = detailsData.data.submissionDetails;

          const code = details.code;
          const cpuUsage = Math.round(details.runtimePercentile * 100) / 100;
          const memoryUsage = Math.round(details.memoryPercentile * 100) / 100;

          const existing = solutionsMap.get(code);

          if (
            !existing ||
            cpuUsage > existing.cpuUsage ||
            memoryUsage > existing.memoryUsage
          ) {
            const status =
              details.statusDisplay === "Accepted"
                ? "DONE"
                : details.statusDisplay === "Time Limit Exceeded"
                  ? "TLE"
                  : details.statusDisplay === "Memory Limit Exceeded"
                    ? "MLE"
                    : "FAILED";

            solutionsMap.set(code, {
              author: process.env.LEETCODE_USERNAME || "Vitor",
              code: code,
              language: details.lang.name,
              explanation:
                existing?.explanation ||
                (await generateExplanation(sub.id, code)),
              explanationSource: "AI",
              status: status,
              cpuUsage: existing
                ? Math.max(existing.cpuUsage, cpuUsage)
                : cpuUsage,
              memoryUsage: existing
                ? Math.max(existing.memoryUsage, memoryUsage)
                : memoryUsage,
              date: new Date(parseInt(sub.timestamp) * 1000).toISOString(),
            });
          }
        }

        fetchedSolutions = Array.from(solutionsMap.values());

        // Sort by date descending (latest first)
        fetchedSolutions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
      } else {
        console.log("No submissions found for this question.");
      }

      const defaultSolutions =
        fetchedSolutions.length > 0
          ? fetchedSolutions
          : [
              {
                author: process.env.LEETCODE_USERNAME || "Vitor",
                code: "",
                language: "javascript",
                explanation: "",
                status: "DONE",
                cpuUsage: 0,
                memoryUsage: 0,
                date: new Date().toISOString(),
              },
            ];
      fs.writeFileSync(
        solutionsFilePath,
        JSON.stringify(defaultSolutions, null, 2),
      );
      console.log(
        fetchedSolutions.length > 0
          ? `Successfully created solutions file with ${fetchedSolutions.length} fetched submissions at ${solutionsFilePath}`
          : `Successfully created empty solutions file at ${solutionsFilePath}`,
      );
    } else {
      console.log(`Solutions file already exists at ${solutionsFilePath}`);
    }
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    process.exit(1);
  }
}

main();
