import { describe, it, expect } from "vitest";
import { parseProblem, parseSolutions } from "./archive-schema";
import {
  Difficulty,
  SolutionStatus,
  type Problem,
  type Solution,
} from "./types";

const PROBLEM: Problem = {
  title: "Stone Game",
  difficulty: Difficulty.Medium,
  description: "<p>Alice and Bob…</p>",
  link: "https://leetcode.com/problems/stone-game/",
  date: "2026-08-02",
};

const SOLUTION: Solution = {
  author: "Vitor",
  code: "return true;",
  language: "typescript",
  aiExplanation: "**Greedy**",
  notes: "First try",
  status: SolutionStatus.Done,
  cpuUsage: 98.5,
  memoryUsage: 12,
  date: "2026-08-02T08:00:00.000Z",
};

describe("parseProblem", () => {
  it("accepts a stored problem as is", () => {
    expect(parseProblem({ ...PROBLEM }, "p.json")).toEqual(PROBLEM);
  });

  // The stored strings must match the enum exactly, so a lowercase tier is
  // as wrong as an unknown one.
  it("rejects a difficulty outside the enum", () => {
    expect(() =>
      parseProblem({ ...PROBLEM, difficulty: "medium" }, "p.json"),
    ).toThrow(
      new TypeError("p.json.difficulty is not one of Easy, Medium, Hard"),
    );
  });

  // The problem's date names its archive day, so it must be a real day.
  it("rejects a date that is not a calendar day", () => {
    expect(() =>
      parseProblem({ ...PROBLEM, date: "2026-02-30" }, "p.json"),
    ).toThrow(TypeError);
  });

  it("rejects a value that is not an object", () => {
    expect(() => parseProblem([PROBLEM], "p.json")).toThrow(
      new TypeError("p.json is not an object"),
    );
  });
});

describe("parseSolutions", () => {
  it("accepts stored solutions as is, in file order", () => {
    const later = { ...SOLUTION, date: "2026-08-02T09:00:00.000Z" };
    expect(parseSolutions([SOLUTION, later], "s.json")).toEqual([
      SOLUTION,
      later,
    ]);
  });

  it("accepts an empty file, which records that nothing was submitted", () => {
    expect(parseSolutions([], "s.json")).toEqual([]);
  });

  // Optional fields must be absent, not present-but-null: a null percentile
  // would otherwise render as a broken progress bar.
  it("rejects an optional field holding the wrong type", () => {
    expect(() =>
      parseSolutions([{ ...SOLUTION, cpuUsage: null }], "s.json"),
    ).toThrow(new TypeError("s.json[0].cpuUsage is not a number"));
  });

  // Solutions are sorted by their timestamp, so one that Date can't parse
  // would sort unpredictably.
  it("rejects a timestamp Date cannot parse", () => {
    expect(() =>
      parseSolutions([{ ...SOLUTION, date: "yesterday" }], "s.json"),
    ).toThrow(new TypeError("s.json[0].date is not a timestamp"));
  });

  it("rejects a value that is not an array", () => {
    expect(() => parseSolutions(SOLUTION, "s.json")).toThrow(
      new TypeError("s.json is not an array"),
    );
  });
});
