import { formatLongDate } from "./date-display";
import type { Problem } from "./types";

/**
 * Default maximum length of an excerpt, ellipsis included: roughly what a
 * search result shows of a page's meta description before cutting it off.
 */
export const EXCERPT_MAX_LENGTH = 155;

const ELLIPSIS = "…";

const BLOCK_TAG_PATTERN =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|img|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi;

const TAG_PATTERN = /<[^>]*>/g;

const ENTITY_PATTERN = /&(?:#(\d+)|#[xX]([\da-fA-F]+)|([A-Za-z][A-Za-z\d]*));/g;

const WHITESPACE_PATTERN = /\s+/g;

const ZERO_WIDTH_PATTERN = /[\u200b-\u200d\u2060\ufeff]/g;

const TRAILING_PUNCTUATION_PATTERN = /[\s,.;:!?–—-]+$/;

const MAX_CODE_POINT = 0x10ffff;

const MIN_SURROGATE = 0xd800;

const MAX_SURROGATE = 0xdfff;

const NAMED_ENTITIES = new Map<string, string>([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
  ["ndash", "–"],
  ["mdash", "—"],
  ["minus", "−"],
  ["times", "×"],
  ["divide", "÷"],
  ["le", "≤"],
  ["ge", "≥"],
  ["ne", "≠"],
  ["larr", "←"],
  ["rarr", "→"],
  ["uarr", "↑"],
  ["darr", "↓"],
  ["harr", "↔"],
  ["lfloor", "⌊"],
  ["rfloor", "⌋"],
  ["lceil", "⌈"],
  ["rceil", "⌉"],
  ["hellip", "…"],
  ["middot", "·"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["ldquo", "“"],
  ["rdquo", "”"],
]);

/**
 * Turns a numeric character reference's code point into its character,
 * rejecting values no well-formed string can hold.
 *
 * @param codePoint The parsed code point.
 * @returns The character, or null for zero, surrogates and anything past
 *   the last Unicode code point.
 */
function decodeCodePoint(codePoint: number): string | null {
  const isSurrogate = codePoint >= MIN_SURROGATE && codePoint <= MAX_SURROGATE;

  if (
    !Number.isInteger(codePoint) ||
    codePoint <= 0 ||
    codePoint > MAX_CODE_POINT ||
    isSurrogate
  ) {
    return null;
  }

  return String.fromCodePoint(codePoint);
}

/**
 * Decodes the HTML character references found in problem statements: every
 * decimal and hexadecimal numeric reference plus a fixed set of common named
 * ones (`&lt;`, `&quot;`, `&nbsp;`, `&rarr;`, ...). The text is scanned once,
 * so a decoded `&amp;` never combines with what follows into a second
 * reference.
 *
 * @param text Text that may contain character references.
 * @returns The text with every recognized reference replaced by its
 *   character; unknown names and invalid code points are left as written.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(
    ENTITY_PATTERN,
    (
      reference: string,
      decimal: string | undefined,
      hex: string | undefined,
      name: string | undefined,
    ): string => {
      if (decimal !== undefined) {
        return decodeCodePoint(Number.parseInt(decimal, 10)) ?? reference;
      }

      if (hex !== undefined) {
        return decodeCodePoint(Number.parseInt(hex, 16)) ?? reference;
      }

      if (name !== undefined) {
        return NAMED_ENTITIES.get(name) ?? reference;
      }

      return reference;
    },
  );
}

/**
 * Flattens sanitized HTML, as stored in `data/problems`, into one line of
 * plain text. Block-level tags become word breaks so adjacent paragraphs and
 * list items don't run together, while inline tags such as `<code>` vanish
 * without adding a space before the punctuation that follows them. Tags are
 * stripped before character references are decoded, so an escaped `&lt;b&gt;`
 * survives as the literal text `<b>`.
 *
 * @param html Sanitized HTML; markup is not validated.
 * @returns The decoded text with zero-width characters removed, every
 *   whitespace run (non-breaking spaces included) collapsed to a single
 *   space, and both ends trimmed.
 */
export function htmlToPlainText(html: string): string {
  const withoutTags = html
    .replace(BLOCK_TAG_PATTERN, " ")
    .replace(TAG_PATTERN, "");

  return decodeHtmlEntities(withoutTags)
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}

/**
 * Shortens text to a length limit, cutting at the last word boundary that
 * fits and marking the cut with an ellipsis. Punctuation and whitespace left
 * dangling at the cut are dropped before the ellipsis, and a single word
 * longer than the limit is cut mid-word.
 *
 * @param text The plain text to shorten.
 * @param maxLength The longest result allowed, ellipsis included (defaults
 *   to {@link EXCERPT_MAX_LENGTH}).
 * @returns The text unchanged when it already fits, otherwise its shortened
 *   form ending in an ellipsis.
 */
export function truncateOnWordBoundary(
  text: string,
  maxLength: number = EXCERPT_MAX_LENGTH,
): string {
  if (text.length <= maxLength) return text;

  const room = Math.max(0, maxLength - ELLIPSIS.length);
  const head = text.slice(0, room);
  const boundary = text.charAt(room) === " " ? room : head.lastIndexOf(" ");
  const cut = boundary > 0 ? head.slice(0, boundary) : head;

  return `${cut.replace(TRAILING_PUNCTUATION_PATTERN, "")}${ELLIPSIS}`;
}

/**
 * Builds a plain-text excerpt of sanitized HTML, for meta descriptions and
 * link previews.
 *
 * @param html Sanitized HTML, such as a problem statement.
 * @param maxLength The longest excerpt allowed, ellipsis included (defaults
 *   to {@link EXCERPT_MAX_LENGTH}).
 * @returns The flattened, decoded text, shortened on a word boundary when it
 *   is too long; empty when the HTML holds no text.
 */
export function excerptFromHtml(
  html: string,
  maxLength: number = EXCERPT_MAX_LENGTH,
): string {
  return truncateOnWordBoundary(htmlToPlainText(html), maxLength);
}

/**
 * Describes an archived problem in one line for its page's meta description:
 * an excerpt of its statement, or, when the statement holds no text, a
 * summary of its title, difficulty and day so the page still gets a
 * description of its own.
 *
 * @param problem The archived problem.
 * @param maxLength The longest description allowed, ellipsis included
 *   (defaults to {@link EXCERPT_MAX_LENGTH}).
 * @returns The plain-text description, never empty.
 */
export function describeProblem(
  problem: Problem,
  maxLength: number = EXCERPT_MAX_LENGTH,
): string {
  const excerpt = excerptFromHtml(problem.description, maxLength);
  if (excerpt) return excerpt;

  return truncateOnWordBoundary(
    `${problem.title}, the ${problem.difficulty} LeetCode daily challenge for ${formatLongDate(problem.date)}.`,
    maxLength,
  );
}
