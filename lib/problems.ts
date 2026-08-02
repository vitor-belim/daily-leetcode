import type { Problem } from "./types";
import type { DailyChallenge } from "./leetcode-api";

export function normalizeLink(link: string): string {
  return link.startsWith("http") ? link : `https://leetcode.com${link}`;
}

// Recovers the LeetCode slug from a stored problem's `link`, so callers that
// already have the problem file can skip the daily-challenge lookup.
export function titleSlugFromLink(link: string): string | null {
  const match = /\/problems\/([^/?#]+)/.exec(link);
  return match ? match[1] : null;
}

export function buildProblem(
  challenge: DailyChallenge,
  description: string,
): Problem {
  const { title, difficulty } = challenge.question;

  return {
    title,
    difficulty,
    description,
    link: normalizeLink(challenge.link),
    date: challenge.date,
  };
}
