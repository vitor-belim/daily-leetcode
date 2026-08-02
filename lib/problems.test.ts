import { describe, it, expect } from "vitest";
import {
  buildProblem,
  normalizeLink,
  sanitizeDescription,
  titleSlugFromLink,
} from "./problems";
import type { DailyChallenge } from "./leetcode-api";
import { Difficulty } from "./types";

const challenge: DailyChallenge = {
  date: "2026-08-02",
  link: "/problems/stone-game/",
  question: {
    questionFrontendId: "877",
    title: "Stone Game",
    titleSlug: "stone-game",
    difficulty: Difficulty.Medium,
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

describe("sanitizeDescription", () => {
  it("keeps the tags LeetCode descriptions actually use", () => {
    const html =
      '<p>Given <code>nums</code>:</p><pre>x<sup>2</sup></pre>' +
      '<img src="https://assets.leetcode.com/a.png" alt="tree" style="width:100px" />' +
      '<a href="https://leetcode.com/x" target="_blank">link</a>';
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("strips scripts and event handlers", () => {
    expect(
      sanitizeDescription('<p onclick="steal()">hi</p><script>steal()</script>'),
    ).toBe("<p>hi</p>");
  });

  it("strips javascript: URLs", () => {
    expect(sanitizeDescription('<a href="javascript:steal()">x</a>')).toBe(
      "<a>x</a>",
    );
  });

  it("drops editor metadata attributes like data-*", () => {
    expect(sanitizeDescription('<p data-start="1" data-end="9">hi</p>')).toBe(
      "<p>hi</p>",
    );
  });
});

describe("buildProblem", () => {
  it("sanitizes the description", () => {
    expect(
      buildProblem(challenge, "<p>hi</p><script>steal()</script>").description,
    ).toBe("<p>hi</p>");
  });

  it("maps a challenge and its description into a Problem", () => {
    expect(buildProblem(challenge, "<p>Alice and Bob…</p>")).toEqual({
      title: "Stone Game",
      difficulty: Difficulty.Medium,
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
