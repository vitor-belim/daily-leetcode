import { describe, it, expect } from "vitest";
import { codeToHtml } from "shiki";
import {
  isBundledLanguage,
  PLAIN_TEXT_LANGUAGE,
  toShikiLanguage,
} from "./shiki-languages";

// Every `lang.name` LeetCode reports for submissions, including the ones
// shiki has no grammar for under that exact name.
const LEETCODE_LANGUAGES = [
  "cpp",
  "java",
  "python",
  "python3",
  "pythondata",
  "c",
  "csharp",
  "javascript",
  "typescript",
  "php",
  "swift",
  "kotlin",
  "dart",
  "golang",
  "ruby",
  "scala",
  "rust",
  "racket",
  "erlang",
  "elixir",
  "bash",
  "mysql",
  "mssql",
  "oraclesql",
  "postgresql",
];

describe("isBundledLanguage", () => {
  it("accepts shiki grammar names and aliases", () => {
    expect(isBundledLanguage("python")).toBe(true);
    expect(isBundledLanguage("go")).toBe(true);
    expect(isBundledLanguage("py")).toBe(true);
  });

  it("rejects LeetCode-only names", () => {
    expect(isBundledLanguage("python3")).toBe(false);
    expect(isBundledLanguage("golang")).toBe(false);
    expect(isBundledLanguage("mysql")).toBe(false);
  });

  it("rejects inherited object keys", () => {
    // An `in` check would let these through and hand shiki a bogus id.
    expect(isBundledLanguage("constructor")).toBe(false);
    expect(isBundledLanguage("toString")).toBe(false);
    expect(isBundledLanguage("__proto__")).toBe(false);
  });
});

describe("toShikiLanguage", () => {
  it("maps LeetCode-specific names to the matching grammar", () => {
    expect(toShikiLanguage("python3")).toBe("python");
    expect(toShikiLanguage("pythondata")).toBe("python");
    expect(toShikiLanguage("golang")).toBe("go");
    expect(toShikiLanguage("mysql")).toBe("sql");
    expect(toShikiLanguage("mssql")).toBe("sql");
    expect(toShikiLanguage("oraclesql")).toBe("sql");
    expect(toShikiLanguage("postgresql")).toBe("sql");
  });

  it("passes names shiki already bundles through unchanged", () => {
    expect(toShikiLanguage("javascript")).toBe("javascript");
    expect(toShikiLanguage("cpp")).toBe("cpp");
    expect(toShikiLanguage("csharp")).toBe("csharp");
    expect(toShikiLanguage("rust")).toBe("rust");
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(toShikiLanguage("Python3")).toBe("python");
    expect(toShikiLanguage(" JavaScript ")).toBe("javascript");
  });

  it("falls back to plain text for unknown names", () => {
    expect(toShikiLanguage("cangjie")).toBe(PLAIN_TEXT_LANGUAGE);
    expect(toShikiLanguage("")).toBe(PLAIN_TEXT_LANGUAGE);
    // Prototype keys must not resolve through the mapping table either.
    expect(toShikiLanguage("constructor")).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it("never resolves a LeetCode name to plain text", () => {
    for (const language of LEETCODE_LANGUAGES) {
      expect(toShikiLanguage(language)).not.toBe(PLAIN_TEXT_LANGUAGE);
    }
  });
});

describe("toShikiLanguage with codeToHtml", () => {
  it("shows that the raw LeetCode name would throw", async () => {
    // Guards the premise of the mapping: if shiki ever bundles `python3`
    // itself, this fails and the table entry can go.
    await expect(
      codeToHtml("print(1)", { lang: "python3", theme: "github-dark" }),
    ).rejects.toThrow();
  });

  it.each([...LEETCODE_LANGUAGES, "cangjie", "not-a-language"])(
    "renders %s without throwing",
    async (language) => {
      const html = await codeToHtml("x = 1", {
        lang: toShikiLanguage(language),
        theme: "github-dark",
      });
      expect(html).toContain("<pre");
    },
  );
});
