import {
  bundledLanguages,
  type BundledLanguage,
  type PlainTextLanguage,
} from "shiki";

/**
 * A language id shiki's `codeToHtml` renders without throwing: a bundled
 * grammar or the plain-text pseudo-language.
 */
export type ShikiLanguage = BundledLanguage | PlainTextLanguage;

/**
 * The plain-text id shiki accepts for code it has no grammar for; it renders
 * the code escaped but uncoloured.
 */
export const PLAIN_TEXT_LANGUAGE: PlainTextLanguage = "text";

/**
 * LeetCode `lang.name` values that are not shiki ids themselves, mapped to
 * the closest bundled grammar. Names LeetCode shares with shiki (`cpp`,
 * `java`, `javascript`, `csharp`, `rust`, ...) need no entry.
 */
const LEETCODE_TO_SHIKI_LANGUAGE: Readonly<Record<string, BundledLanguage>> = {
  python3: "python",
  pythondata: "python",
  golang: "go",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  postgresql: "sql",
};

/**
 * Tells whether a string is a language id bundled with shiki (a grammar
 * name or one of its aliases). Uses an own-property check so prototype keys
 * like `constructor` never pass.
 *
 * @param language The candidate language id.
 * @returns True when shiki's bundled languages include it.
 */
export function isBundledLanguage(
  language: string,
): language is BundledLanguage {
  return Object.hasOwn(bundledLanguages, language);
}

/**
 * Resolves the language LeetCode reports for a submission to one shiki can
 * highlight, so an unfamiliar name degrades to plain text instead of making
 * `codeToHtml` throw and taking the whole page down.
 *
 * @param leetcodeLanguage LeetCode's `lang.name`, e.g. `python3` or
 *   `golang`; matched case-insensitively.
 * @returns The mapped grammar for LeetCode-specific names, the name itself
 *   when shiki bundles it, and otherwise `PLAIN_TEXT_LANGUAGE`.
 */
export function toShikiLanguage(leetcodeLanguage: string): ShikiLanguage {
  const name = leetcodeLanguage.trim().toLowerCase();
  const mapped = Object.hasOwn(LEETCODE_TO_SHIKI_LANGUAGE, name)
    ? LEETCODE_TO_SHIKI_LANGUAGE[name]
    : undefined;
  if (mapped !== undefined) {
    return mapped;
  }
  return isBundledLanguage(name) ? name : PLAIN_TEXT_LANGUAGE;
}
