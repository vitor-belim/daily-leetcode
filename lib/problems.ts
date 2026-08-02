import sanitizeHtml from "sanitize-html";
import type { Problem } from "./types";
import type { DailyChallenge } from "./leetcode-api";

const DESCRIPTION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "font"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height", "style"],
    font: ["face"],
    "*": ["class", "style"],
  },
  allowedSchemes: ["https", "http"],
};

/**
 * Sanitizes a problem description's HTML once, at fetch time, since
 * descriptions are later rendered with dangerouslySetInnerHTML. The
 * allowlist covers every tag/attribute observed across the committed
 * archive; scripts, event handlers, unsafe URL schemes and editor metadata
 * like `data-*` are dropped.
 *
 * @param html The raw description HTML from LeetCode.
 * @returns The sanitized HTML.
 */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, DESCRIPTION_SANITIZE_OPTIONS);
}

/**
 * Ensures a problem link is absolute.
 *
 * @param link The link from LeetCode, absolute or site-relative.
 * @returns The absolute URL on leetcode.com.
 */
export function normalizeLink(link: string): string {
  return link.startsWith("http") ? link : `https://leetcode.com${link}`;
}

/**
 * Recovers the LeetCode question slug from a stored problem's `link`, so
 * callers that already have the problem file can skip the daily-challenge
 * lookup.
 *
 * @param link The problem link, absolute or relative.
 * @returns The slug (e.g. "stone-game"), or null when the link has no
 *   `/problems/<slug>` segment.
 */
export function titleSlugFromLink(link: string): string | null {
  const match = /\/problems\/([^/?#]+)/.exec(link);
  return match?.[1] ?? null;
}

/**
 * Maps a LeetCode daily challenge and its description into the archive's
 * `Problem` shape.
 *
 * @param challenge The daily challenge (source of title, difficulty, link
 *   and date).
 * @param description The raw description HTML; sanitized here.
 * @returns The problem ready to be written to `data/problems`.
 */
export function buildProblem(
  challenge: DailyChallenge,
  description: string,
): Problem {
  const { title, difficulty } = challenge.question;

  return {
    title,
    difficulty,
    description: sanitizeDescription(description),
    link: normalizeLink(challenge.link),
    date: challenge.date,
  };
}
