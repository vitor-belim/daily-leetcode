import { describe, it, expect } from "vitest";
import type { Solution } from "./types";
import { statusFromDisplay, score, buildSolution, dedupeSolutions } from "./solutions";
import type { SubmissionListItem, SubmissionDetails } from "./leetcode-api";

describe("statusFromDisplay", () => {
  it("maps Accepted to DONE", () => {
    expect(statusFromDisplay("Accepted")).toBe("DONE");
  });

  it("maps Time Limit Exceeded to TLE", () => {
    expect(statusFromDisplay("Time Limit Exceeded")).toBe("TLE");
  });

  it("maps Memory Limit Exceeded to MLE", () => {
    expect(statusFromDisplay("Memory Limit Exceeded")).toBe("MLE");
  });

  it("defaults anything else (e.g. Wrong Answer) to FAILED", () => {
    expect(statusFromDisplay("Wrong Answer")).toBe("FAILED");
    expect(statusFromDisplay("Runtime Error")).toBe("FAILED");
  });
});

describe("score", () => {
  it("sums cpuUsage and memoryUsage", () => {
    expect(score(makeSolution({ cpuUsage: 50, memoryUsage: 30 }))).toBe(80);
  });

  it("treats missing usage fields as 0", () => {
    expect(score(makeSolution({ cpuUsage: undefined, memoryUsage: undefined }))).toBe(0);
  });
});

describe("buildSolution", () => {
  it("maps a submission + details into a Solution", () => {
    const sub: SubmissionListItem = {
      id: "123",
      statusDisplay: "Accepted",
      lang: "javascript",
      runtime: "50 ms",
      memory: "40 MB",
      timestamp: "1753430400", // 2025-07-25T08:00:00.000Z
      url: "/submissions/123",
    };
    const details: SubmissionDetails = {
      runtimePercentile: 91.3141,
      memoryPercentile: 30.1234,
      code: "var x = 1;",
      timestamp: "1753430400",
      statusDisplay: "Accepted",
      lang: { name: "javascript", verboseName: "JavaScript" },
    };

    const solution = buildSolution(sub, details);

    expect(solution.code).toBe("var x = 1;");
    expect(solution.language).toBe("javascript");
    expect(solution.status).toBe("DONE");
    expect(solution.cpuUsage).toBe(91.31);
    expect(solution.memoryUsage).toBe(30.12);
    expect(solution.notes).toBe("");
    expect(solution.aiExplanation).toBe("");
    expect(solution.date).toBe(new Date(1753430400 * 1000).toISOString());
  });
});

describe("dedupeSolutions", () => {
  it("keeps the higher-scoring submission wholesale for duplicate code, without splicing fields", () => {
    const lower = makeSolution({
      code: "same code",
      status: "FAILED",
      cpuUsage: 50,
      memoryUsage: 10,
      date: "2026-01-01T00:00:00.000Z",
    });
    const higher = makeSolution({
      code: "same code",
      status: "DONE",
      cpuUsage: 20,
      memoryUsage: 80,
      date: "2026-01-02T00:00:00.000Z",
    });

    const result = dedupeSolutions([lower, higher]);

    expect(result).toHaveLength(1);
    // The whole `higher` submission wins (score 100 > 60) — its own
    // status/date travel together, not spliced with `lower`'s fields.
    expect(result[0]).toEqual(higher);
  });

  it("keeps distinct codes as separate entries, sorted ascending by date", () => {
    const first = makeSolution({ code: "a", date: "2026-01-02T00:00:00.000Z" });
    const second = makeSolution({ code: "b", date: "2026-01-01T00:00:00.000Z" });

    const result = dedupeSolutions([first, second]);

    expect(result.map((s) => s.code)).toEqual(["b", "a"]);
  });
});

function makeSolution(overrides: Partial<Solution>): Solution {
  return {
    author: "Vitor",
    code: "code",
    language: "javascript",
    notes: "",
    aiExplanation: "",
    status: "DONE",
    cpuUsage: 0,
    memoryUsage: 0,
    date: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
