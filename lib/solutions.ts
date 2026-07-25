import type { Solution } from "./types";
import type { SubmissionListItem, SubmissionDetails } from "./leetcode-api";

export function statusFromDisplay(statusDisplay: string): Solution["status"] {
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

export function score(solution: Solution): number {
  return (solution.cpuUsage || 0) + (solution.memoryUsage || 0);
}

export function buildSolution(
  sub: SubmissionListItem,
  details: SubmissionDetails,
): Solution {
  return {
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
}

// Keeps, per distinct `code` string, whichever submission has the higher
// combined cpu+memory score, taking ALL fields from that one submission
// (never splicing fields from two different submissions together).
export function dedupeSolutions(candidates: Solution[]): Solution[] {
  const solutionsMap = new Map<string, Solution>();

  for (const candidate of candidates) {
    const existing = solutionsMap.get(candidate.code);
    if (!existing || score(candidate) > score(existing)) {
      solutionsMap.set(candidate.code, candidate);
    }
  }

  return Array.from(solutionsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
