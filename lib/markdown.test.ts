import { describe, it, expect } from "vitest";
import { markdownToHtml } from "./markdown";

// This suite locks in markdownToHtml's EXACT current output, including
// quirks that look like bugs (e.g. superscripting can inject broken,
// overlapping tags inside an already-wrapped <code> span). Do not "fix"
// those here — changing the regexes re-renders already-committed content
// in data/. See the comment above applyMathSubstitutions in markdown.ts.

describe("markdownToHtml", () => {
  it("returns an empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
  });

  it("escapes HTML entities", () => {
    expect(markdownToHtml(`hello & <world> "quoted" 'single'`)).toBe(
      "hello &amp; &lt;world&gt; &quot;quoted&quot; &#039;single&#039;",
    );
  });

  it("renders bold via ** and __", () => {
    expect(markdownToHtml("**bold** and __also bold__")).toBe(
      "<strong>bold</strong> and <strong>also bold</strong>",
    );
  });

  it("renders italic via * and _", () => {
    expect(markdownToHtml("*italic* and _also italic_")).toBe(
      "<em>italic</em> and <em>also italic</em>",
    );
  });

  it("renders inline code", () => {
    expect(markdownToHtml("inline `code` here")).toBe(
      "inline <code>code</code> here",
    );
  });

  it("applies the hardcoded $10^9 + 7$ substitution", () => {
    expect(markdownToHtml("$10^9 + 7$")).toBe("10<sup>9</sup> + 7");
  });

  it("leaves a bare caret-with-space untouched", () => {
    expect(markdownToHtml("nums[j] ^ nums[k]")).toBe("nums[j] ^ nums[k]");
  });

  it("leaves a caret-with-space untouched even inside inline code", () => {
    expect(markdownToHtml("The result is `nums[j] ^ nums[k]` computed")).toBe(
      "The result is <code>nums[j] ^ nums[k]</code> computed",
    );
  });

  it("QUIRK: the generic superscript rule greedily eats a trailing paren outside code", () => {
    expect(markdownToHtml("The complexity is O(n^2) in the worst case")).toBe(
      "The complexity is O(n<sup>2)</sup> in the worst case",
    );
  });

  it("QUIRK: superscripting inside inline code produces overlapping/malformed tags", () => {
    // The <sup> open tag lands inside <code>, but its close tag lands
    // after </code> — genuinely malformed HTML, captured as-is.
    expect(markdownToHtml("`O(n^2)`")).toBe("<code>O(n<sup>2)</code></sup>");
    expect(markdownToHtml("Time complexity: `O(n^2)`.")).toBe(
      "Time complexity: <code>O(n<sup>2)</code>.</sup>",
    );
  });

  it("normalizes \\r\\n and single newlines to <br />", () => {
    expect(markdownToHtml("line one\nline two")).toBe("line one<br />line two");
    expect(markdownToHtml("line one\r\nline two")).toBe(
      "line one<br />line two",
    );
  });

  it("splits double newlines into paragraph breaks", () => {
    expect(markdownToHtml("paragraph one\n\nparagraph two")).toBe(
      "paragraph one</p><p>paragraph two",
    );
  });
});
