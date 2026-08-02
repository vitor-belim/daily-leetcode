import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml", () => {
  it("returns an empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
  });

  it("renders raw HTML in the source as escaped text", () => {
    expect(markdownToHtml(`hello & <world> "quoted"`)).toBe(
      "<p>hello &amp; &lt;world&gt; &quot;quoted&quot;</p>",
    );
  });

  it("renders bold via ** and __", () => {
    expect(markdownToHtml("**bold** and __also bold__")).toBe(
      "<p><strong>bold</strong> and <strong>also bold</strong></p>",
    );
  });

  it("renders italic via * and _", () => {
    expect(markdownToHtml("*italic* and _also italic_")).toBe(
      "<p><em>italic</em> and <em>also italic</em></p>",
    );
  });

  it("renders inline code", () => {
    expect(markdownToHtml("inline `code` here")).toBe(
      "<p>inline <code>code</code> here</p>",
    );
  });

  it("keeps underscores inside inline code literal", () => {
    expect(markdownToHtml("Use `left_ptr` and `right_ptr` here")).toBe(
      "<p>Use <code>left_ptr</code> and <code>right_ptr</code> here</p>",
    );
  });

  it("keeps asterisks inside inline code literal", () => {
    expect(markdownToHtml("`n * n` and `10 ** 9 + 7`")).toBe(
      "<p><code>n * n</code> and <code>10 ** 9 + 7</code></p>",
    );
  });

  it("renders lists", () => {
    expect(markdownToHtml("- item one\n- item two")).toBe(
      "<ul>\n<li>item one</li>\n<li>item two</li>\n</ul>",
    );
  });

  it("renders $...$ math with a spaced exponent expression", () => {
    expect(markdownToHtml("$10^9 + 7$")).toBe("<p>10<sup>9</sup> + 7</p>");
  });

  it("keeps a braceless exponent to the alphanumeric run after the caret", () => {
    expect(markdownToHtml("$10^9+7$")).toBe("<p>10<sup>9</sup>+7</p>");
  });

  it("renders braced exponents, unwrapping \\text", () => {
    expect(markdownToHtml("$2^{\\text{distance} - 1}$")).toBe(
      "<p>2<sup>distance - 1</sup></p>",
    );
  });

  it("leaves a caret outside $...$ untouched", () => {
    expect(markdownToHtml("The complexity is O(n^2) in the worst case")).toBe(
      "<p>The complexity is O(n^2) in the worst case</p>",
    );
    expect(markdownToHtml("nums[j] ^ nums[k]")).toBe(
      "<p>nums[j] ^ nums[k]</p>",
    );
  });

  it("leaves carets and dollars inside inline code untouched", () => {
    expect(markdownToHtml("`O(n^2)` and `$10^9$`")).toBe(
      "<p><code>O(n^2)</code> and <code>$10^9$</code></p>",
    );
  });

  it("leaves carets inside fenced code blocks untouched", () => {
    expect(markdownToHtml("```\na ^ b\n$x^2$\n```")).toBe(
      "<pre><code>a ^ b\n$x^2$\n</code></pre>",
    );
  });

  it("renders single newlines as <br>", () => {
    expect(markdownToHtml("line one\nline two")).toBe(
      "<p>line one<br>\nline two</p>",
    );
    expect(markdownToHtml("line one\r\nline two")).toBe(
      "<p>line one<br>\nline two</p>",
    );
  });

  it("renders double newlines as separate paragraphs", () => {
    expect(markdownToHtml("paragraph one\n\nparagraph two")).toBe(
      "<p>paragraph one</p>\n<p>paragraph two</p>",
    );
  });
});
