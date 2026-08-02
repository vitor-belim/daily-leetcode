import { SolutionStatus, type Solution } from "./types";
import type { SubmissionListItem, SubmissionDetails } from "./leetcode-api";

/**
 * Maps LeetCode's human-readable submission status to the archive's
 * `SolutionStatus`.
 *
 * @param statusDisplay LeetCode's status string, e.g. "Accepted".
 * @returns The matching status; anything unrecognized (e.g. "Wrong Answer",
 *   "Runtime Error") maps to `Failed`.
 */
export function statusFromDisplay(statusDisplay: string): SolutionStatus {
  switch (statusDisplay) {
    case "Accepted":
      return SolutionStatus.Done;
    case "Time Limit Exceeded":
      return SolutionStatus.TimeLimitExceeded;
    case "Memory Limit Exceeded":
      return SolutionStatus.MemoryLimitExceeded;
    default:
      return SolutionStatus.Failed;
  }
}

/**
 * Scores a solution by summing its runtime and memory percentiles, used to
 * rank duplicate submissions.
 *
 * @param solution The solution to score.
 * @returns The combined percentile score; missing usage fields count as 0.
 */
export function score(solution: Solution): number {
  return (solution.cpuUsage || 0) + (solution.memoryUsage || 0);
}

/**
 * Maps a LeetCode submission and its details into the archive's `Solution`
 * shape.
 *
 * @param sub The submission list entry (source of the timestamp).
 * @param details The submission details (source of code, language, status
 *   and percentiles, rounded to two decimals).
 * @returns The solution, with empty notes/aiExplanation and the author from
 *   `LEETCODE_USERNAME` (falling back to "Vitor").
 */
export function buildSolution(
  sub: SubmissionListItem,
  details: SubmissionDetails,
): Solution {
  return {
    author: process.env["LEETCODE_USERNAME"] || "Vitor",
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

/**
 * Deduplicates submissions by their exact `code` string, keeping whichever
 * has the higher combined cpu+memory score. All fields travel together from
 * the winning submission; fields from two submissions are never spliced.
 *
 * @param candidates The solutions to deduplicate.
 * @returns One solution per distinct code, sorted ascending by date.
 */
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
