import { describe, it, expect } from "vitest";
import {
  decodeHtmlEntities,
  describeProblem,
  EXCERPT_MAX_LENGTH,
  excerptFromHtml,
  htmlToPlainText,
  truncateOnWordBoundary,
} from "./excerpt";
import { Difficulty, type Problem } from "./types";

describe("decodeHtmlEntities", () => {
  it("decodes the named references used in problem statements", () => {
    expect(
      decodeHtmlEntities(
        "1 &lt;= n &lt;= 10 &amp;&amp; &quot;a&quot; &rarr; &lfloor;x&rfloor; &ndash; &minus;1",
      ),
    ).toBe('1 <= n <= 10 && "a" → ⌊x⌋ – −1');
  });

  it("decodes decimal and hexadecimal numeric references", () => {
    expect(decodeHtmlEntities("it&#39;s &#x2192; &#X2192;")).toBe("it's → →");
  });

  it("turns &nbsp; into a non-breaking space", () => {
    expect(decodeHtmlEntities("m&nbsp;x")).toBe("m x");
  });

  it("decodes in a single pass, so an escaped reference stays escaped", () => {
    // &amp;lt; is the text "&lt;", not a less-than sign
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
  });

  it("leaves unknown names untouched, including Object prototype keys", () => {
    // A plain-object lookup would turn &constructor; into a function's source
    expect(decodeHtmlEntities("&bogus; &constructor; &toString;")).toBe(
      "&bogus; &constructor; &toString;",
    );
  });

  it("leaves numeric references to invalid code points untouched", () => {
    // Zero, a lone surrogate and one past U+10FFFF are not characters
    expect(decodeHtmlEntities("&#0; &#xD800; &#1114112;")).toBe(
      "&#0; &#xD800; &#1114112;",
    );
  });

  it("leaves a bare ampersand alone", () => {
    expect(decodeHtmlEntities("a & b")).toBe("a & b");
  });
});

describe("htmlToPlainText", () => {
  it("drops inline tags without adding space before punctuation", () => {
    expect(
      htmlToPlainText("Given an integer array <code>nums</code>, return it."),
    ).toBe("Given an integer array nums, return it.");
  });

  it("keeps block-level elements from running together", () => {
    expect(
      htmlToPlainText(
        "<p>One.</p><p>Two:</p><ul><li>a</li><li>b</li></ul>c<br>d",
      ),
    ).toBe("One. Two: a b c d");
  });

  it("decodes references only after stripping tags", () => {
    // The escaped tag is statement text, so it must survive as text
    expect(htmlToPlainText("<p>Use &lt;b&gt; here</p>")).toBe("Use <b> here");
  });

  it("collapses whitespace runs, non-breaking spaces included, and trims", () => {
    expect(htmlToPlainText("\n\t<p> a \n&nbsp; b </p>\n<p>&nbsp;</p>")).toBe(
      "a b",
    );
  });

  it("removes zero-width characters copied from LeetCode statements", () => {
    // 2026-04-19 writes "nums1" followed by a run of zero-width spaces
    expect(htmlToPlainText("<code>nums1\u200b\u200b\u200b</code> and")).toBe(
      "nums1 and",
    );
  });

  it("returns an empty string for markup without text", () => {
    expect(htmlToPlainText('<p>&nbsp;</p><img src="x.png" alt="">')).toBe("");
  });
});

describe("truncateOnWordBoundary", () => {
  it("returns text that already fits unchanged", () => {
    expect(truncateOnWordBoundary("short", 10)).toBe("short");
  });

  it("returns text exactly at the limit unchanged", () => {
    expect(truncateOnWordBoundary("0123456789", 10)).toBe("0123456789");
  });

  it("cuts at the last space that fits and appends an ellipsis", () => {
    // Only "The quick b" fits before the ellipsis, so the partial word goes
    expect(truncateOnWordBoundary("The quick brown fox", 12)).toBe(
      "The quick…",
    );
  });

  it("keeps a whole word that ends exactly where the room runs out", () => {
    // "The quick" is the 9 characters of room and is followed by a space
    expect(truncateOnWordBoundary("The quick brown fox", 10)).toBe(
      "The quick…",
    );
  });

  it("drops punctuation left dangling at the cut", () => {
    expect(truncateOnWordBoundary("Hello, world again", 10)).toBe("Hello…");
  });

  it("cuts a single over-long word mid-word", () => {
    expect(truncateOnWordBoundary("Supercalifragilistic", 8)).toBe("Superca…");
  });

  it("never exceeds the limit, ellipsis included", () => {
    const text = "word ".repeat(100).trim();
    const result = truncateOnWordBoundary(text);
    expect(result.length).toBeLessThanOrEqual(EXCERPT_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("excerptFromHtml", () => {
  // Opening of the archived 2026-07-20 statement, "Shift 2D Grid"
  const statement =
    "<p>Given a 2D <code>grid</code> of size <code>m x n</code>&nbsp;and an integer <code>k</code>. You need to shift the <code>grid</code>&nbsp;<code>k</code> times.</p>\n\n<p>In one shift operation:</p>\n\n<ul>\n\t<li>Element at <code>grid[i][j]</code> moves to <code>grid[i][j + 1]</code>.</li>\n\t<li>Element at <code>grid[i][n - 1]</code> moves to <code>grid[i + 1][0]</code>.</li>\n</ul>";

  it("flattens a statement into a word-bounded plain-text excerpt", () => {
    const excerpt = excerptFromHtml(statement);
    expect(excerpt).toBe(
      "Given a 2D grid of size m x n and an integer k. You need to shift the grid k times. In one shift operation: Element at grid[i][j] moves to grid[i][j + 1]…",
    );
    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX_LENGTH);
  });

  it("honors a custom limit", () => {
    expect(excerptFromHtml(statement, 30)).toBe(
      "Given a 2D grid of size m x n…",
    );
  });
});

describe("describeProblem", () => {
  const problem: Problem = {
    title: "Shift 2D Grid",
    difficulty: Difficulty.Easy,
    description: "<p>Given a 2D <code>grid</code>.</p>",
    link: "https://leetcode.com/problems/shift-2d-grid/",
    date: "2026-07-20",
  };

  it("uses the statement excerpt when the statement has text", () => {
    expect(describeProblem(problem)).toBe("Given a 2D grid.");
  });

  it("falls back to a title, difficulty and day summary for an empty statement", () => {
    expect(describeProblem({ ...problem, description: "<p>&nbsp;</p>" })).toBe(
      "Shift 2D Grid, the Easy LeetCode daily challenge for July 20th, 2026.",
    );
  });
});
