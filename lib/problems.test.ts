import { describe, it, expect } from "vitest";
import {
  buildProblem,
  extractImageSize,
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
      titleSlugFromLink(
        "https://leetcode.com/problems/stone-game/description/",
      ),
    ).toBe("stone-game");
    expect(titleSlugFromLink("/problems/stone-game?envType=daily")).toBe(
      "stone-game",
    );
    expect(titleSlugFromLink("/problems/stone-game#solution")).toBe(
      "stone-game",
    );
  });

  it("returns null when the link has no problem segment", () => {
    expect(
      titleSlugFromLink("https://leetcode.com/contest/weekly-1/"),
    ).toBeNull();
    expect(titleSlugFromLink("")).toBeNull();
  });
});

describe("extractImageSize", () => {
  it("lifts a compact pixel width and height out of the style", () => {
    expect(extractImageSize("width:521px;height:300px")).toEqual({
      width: "521",
      height: "300",
      remainingStyle: "",
    });
  });

  it("handles the spaced, semicolon-terminated and reversed forms LeetCode uses", () => {
    expect(extractImageSize("width: 329px; height: 313px;")).toEqual({
      width: "329",
      height: "313",
      remainingStyle: "",
    });
    expect(extractImageSize("height:180px;width:200px")).toEqual({
      width: "200",
      height: "180",
      remainingStyle: "",
    });
  });

  it("keeps every other declaration in its original order", () => {
    expect(
      extractImageSize(
        "padding:10px;background:rgb(255, 255, 255);border-radius:0.5rem;width:175px;height:350px",
      ),
    ).toEqual({
      width: "175",
      height: "350",
      remainingStyle:
        "padding:10px;background:rgb(255, 255, 255);border-radius:0.5rem",
    });
  });

  it("reports a missing dimension as null", () => {
    expect(extractImageSize("width:200px")).toEqual({
      width: "200",
      height: null,
      remainingStyle: "",
    });
    expect(extractImageSize("")).toEqual({
      width: null,
      height: null,
      remainingStyle: "",
    });
  });

  it("leaves non-pixel sizes and look-alike properties in the style", () => {
    // Only exact px `width`/`height` become attributes; percentages, ems and
    // `max-width` keep their CSS meaning.
    expect(extractImageSize("width:50%;height:2em;max-width:300px")).toEqual({
      width: null,
      height: null,
      remainingStyle: "width:50%;height:2em;max-width:300px",
    });
  });

  it("rounds fractional pixels and lets the last declaration win", () => {
    // HTML dimension attributes are whole numbers, and later CSS
    // declarations override earlier ones.
    expect(extractImageSize("width:100px;width:120.6px;HEIGHT:40.2PX")).toEqual(
      {
        width: "121",
        height: "40",
        remainingStyle: "",
      },
    );
  });
});

describe("sanitizeDescription", () => {
  it("keeps the tags LeetCode descriptions actually use", () => {
    const html =
      "<p>Given <code>nums</code>:</p><pre>x<sup>2</sup></pre>" +
      '<a href="https://leetcode.com/x" target="_blank">link</a>';
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("turns an inline pixel size into width/height attributes and lazy-loads the image", () => {
    expect(
      sanitizeDescription(
        '<img alt="" src="https://assets.leetcode.com/a.png" style="width: 329px; height: 313px;" />',
      ),
    ).toBe(
      '<img alt="" src="https://assets.leetcode.com/a.png" width="329" height="313" loading="lazy" decoding="async" />',
    );
  });

  it("keeps the non-size declarations of an image style", () => {
    expect(
      sanitizeDescription(
        '<img alt="" src="https://assets.leetcode.com/a.png" style="padding: 10px; background: rgb(255, 255, 255); width: 310px; height: 130px;" />',
      ),
    ).toBe(
      '<img alt="" src="https://assets.leetcode.com/a.png" width="310" height="130" style="padding:10px;background:rgb(255, 255, 255)" loading="lazy" decoding="async" />',
    );
  });

  it("keeps existing width/height attributes when the style has no size", () => {
    expect(
      sanitizeDescription(
        '<img height="169" src="https://assets.leetcode.com/a.png" width="808" />',
      ),
    ).toBe(
      '<img src="https://assets.leetcode.com/a.png" width="808" height="169" loading="lazy" decoding="async" />',
    );
  });

  it("lets a style size override a conflicting attribute, as CSS would", () => {
    expect(
      sanitizeDescription(
        '<img src="https://assets.leetcode.com/a.png" width="808" style="width:400px" />',
      ),
    ).toBe(
      '<img src="https://assets.leetcode.com/a.png" width="400" loading="lazy" decoding="async" />',
    );
  });

  it("still strips unsafe image attributes", () => {
    expect(
      sanitizeDescription(
        '<img src="javascript:steal()" onerror="steal()" loading="eager" />',
      ),
    ).toBe('<img loading="lazy" decoding="async" />');
  });

  it("is idempotent, so the committed archive can be re-sanitized", () => {
    // Each fixture mirrors an image shape found in data/problems; a second
    // pass must return the first pass's output byte for byte.
    const fixtures = [
      '<p>See:</p><img alt="" src="https://assets.leetcode.com/a.png" style="width:521px;height:300px" />',
      '<img alt="" src="https://assets.leetcode.com/a.png" style="width: 329px; height: 313px;" />',
      '<img alt="" src="https://assets.leetcode.com/a.png" style="padding:10px;background:#fff;border-radius:.5rem" />',
      '<img alt="" src="https://assets.leetcode.com/a.png" style="padding: 10px; background: rgb(255, 255, 255); border-radius: 0.5rem; width: 309px; height: 129px;" />',
      '<img height="172" src="https://assets.leetcode.com/a.png" width="284" />',
      '<img alt="" src="https://assets.leetcode.com/a.png" />',
      "<p>a&nbsp;b &quot;c&quot;</p>",
    ];

    for (const fixture of fixtures) {
      const once = sanitizeDescription(fixture);
      expect(sanitizeDescription(once)).toBe(once);
    }
  });

  it("strips scripts and event handlers", () => {
    expect(
      sanitizeDescription(
        '<p onclick="steal()">hi</p><script>steal()</script>',
      ),
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

  it("sizes description images through attributes", () => {
    expect(
      buildProblem(
        challenge,
        '<img src="https://assets.leetcode.com/a.png" style="width:521px;height:300px" />',
      ).description,
    ).toBe(
      '<img src="https://assets.leetcode.com/a.png" width="521" height="300" loading="lazy" decoding="async" />',
    );
  });

  // LeetCode has served titles with a leading space (2026-09-29), which
  // would otherwise show up in <title> and og:title.
  it("trims stray whitespace around the title", () => {
    expect(
      buildProblem(
        {
          ...challenge,
          question: { ...challenge.question, title: " Stone Game " },
        },
        "<p>hi</p>",
      ).title,
    ).toBe("Stone Game");
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
