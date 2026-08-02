import { describe, it, expect } from "vitest";
import { buildProblem, normalizeLink, titleSlugFromLink } from "./problems";
import type { DailyChallenge } from "./leetcode-api";

const challenge: DailyChallenge = {
  date: "2026-08-02",
  link: "/problems/stone-game/",
  question: {
    questionFrontendId: "877",
    title: "Stone Game",
    titleSlug: "stone-game",
    difficulty: "Medium",
  },
};

describe("normalizeLink", () => {
  it("prefixes the host on a relative link", () => {
    expect(normalizeLink("/problems/stone-game/")).toBe(
      "https://leetcode.com/problems/stone-game/",
    );
  });

  it("leaves an absolute link untouched", () => {
    expect(normalizeLink("https://leetcode.com/problems/stone-game/")).toBe(
      "https://leetcode.com/problems/stone-game/",
    );
  });
});

describe("titleSlugFromLink", () => {
  it("extracts the slug from an absolute link", () => {
    expect(titleSlugFromLink("https://leetcode.com/problems/stone-game/")).toBe(
      "stone-game",
    );
  });

  it("extracts the slug from a relative link", () => {
    expect(titleSlugFromLink("/problems/stone-game/")).toBe("stone-game");
  });

  it("ignores trailing path, query and hash segments", () => {
    expect(
      titleSlugFromLink("https://leetcode.com/problems/stone-game/description/"),
    ).toBe("stone-game");
    expect(titleSlugFromLink("/problems/stone-game?envType=daily")).toBe(
      "stone-game",
    );
    expect(titleSlugFromLink("/problems/stone-game#solution")).toBe(
      "stone-game",
    );
  });

  it("returns null when the link has no problem segment", () => {
    expect(titleSlugFromLink("https://leetcode.com/contest/weekly-1/")).toBeNull();
    expect(titleSlugFromLink("")).toBeNull();
  });
});

describe("buildProblem", () => {
  it("maps a challenge and its description into a Problem", () => {
    expect(buildProblem(challenge, "<p>Alice and Bob…</p>")).toEqual({
      title: "Stone Game",
      difficulty: "Medium",
      description: "<p>Alice and Bob…</p>",
      link: "https://leetcode.com/problems/stone-game/",
      date: "2026-08-02",
    });
  });

  it("keeps an already-absolute link as-is", () => {
    const absolute: DailyChallenge = {
      ...challenge,
      link: "https://leetcode.com/problems/stone-game/",
    };

    expect(buildProblem(absolute, "").link).toBe(
      "https://leetcode.com/problems/stone-game/",
    );
  });
});
