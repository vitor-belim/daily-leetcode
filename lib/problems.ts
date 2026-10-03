import sanitizeHtml from "sanitize-html";
import type { Problem } from "./types";
import type { DailyChallenge } from "./leetcode-api";

/**
 * The image box dimensions LeetCode fixes in inline styles, named after the
 * CSS properties and the matching `<img>` attributes.
 */
export enum ImageDimension {
  Width = "width",
  Height = "height",
}

/**
 * One pixel-valued `width` or `height` declaration lifted out of an inline
 * style.
 */
export interface PixelDimension {
  property: ImageDimension;
  pixels: string;
}

/**
 * An image's inline style split into the pixel size it declared and the
 * declarations left over.
 */
export interface InlineImageSize {
  width: string | null;
  height: string | null;
  remainingStyle: string;
}

/**
 * Matches a whole `width: <n>px` or `height: <n>px` declaration, capturing
 * the property and the numeric length.
 */
const PIXEL_DIMENSION_DECLARATION = /^(width|height)\s*:\s*(\d+(?:\.\d+)?)px$/i;

/**
 * Attributes the image transform rewrites itself; any incoming copies are
 * replaced rather than kept in their original position, which is what makes
 * the transform idempotent.
 */
const MANAGED_IMAGE_ATTRIBUTES: ReadonlySet<string> = new Set([
  "style",
  ImageDimension.Width,
  ImageDimension.Height,
  "loading",
  "decoding",
]);

/**
 * Parses one inline-style declaration as a pixel image dimension.
 *
 * @param declaration A single trimmed declaration, e.g. `width: 300px`.
 * @returns The dimension with its length rounded to whole pixels (as HTML
 *   dimension attributes expect), or null when the declaration is not a
 *   pixel `width`/`height`.
 */
function parsePixelDimension(declaration: string): PixelDimension | null {
  const match = PIXEL_DIMENSION_DECLARATION.exec(declaration);
  const name = match?.[1]?.toLowerCase();
  const length = match?.[2];
  const property = Object.values(ImageDimension).find(
    (dimension) => dimension === name,
  );
  if (property === undefined || length === undefined) {
    return null;
  }
  return { property, pixels: String(Math.round(Number(length))) };
}

/**
 * Splits an image's inline style into its pixel `width`/`height` and the
 * remaining declarations. LeetCode sizes description images with inline
 * styles; an inline `height` beats the stylesheet's `height: auto`, so once
 * `max-width: 100%` narrows the image its aspect ratio breaks. Lifting the
 * size into attributes keeps the reserved box while letting CSS scale it.
 *
 * @param style The inline style attribute value (may be empty).
 * @returns The last pixel width and height declared (null when absent or
 *   not in px) and the other declarations joined with `;`, or an empty
 *   string when nothing else remains.
 */
export function extractImageSize(style: string): InlineImageSize {
  const declarations = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration !== "");
  const dimensions = declarations
    .map(parsePixelDimension)
    .filter((dimension): dimension is PixelDimension => dimension !== null);

  return {
    width:
      dimensions.findLast(
        (dimension) => dimension.property === ImageDimension.Width,
      )?.pixels ?? null,
    height:
      dimensions.findLast(
        (dimension) => dimension.property === ImageDimension.Height,
      )?.pixels ?? null,
    remainingStyle: declarations
      .filter((declaration) => parsePixelDimension(declaration) === null)
      .join(";"),
  };
}

/**
 * sanitize-html transform for description `<img>` tags: moves inline pixel
 * width/height into `width`/`height` attributes (a style size overrides an
 * existing attribute, as it would in CSS), drops the style when nothing else
 * remains in it, and adds `loading="lazy"` and `decoding="async"`. Running
 * it on its own output returns the same tag.
 *
 * @param tagName The tag being transformed (always `img`).
 * @param attribs The tag's attributes as parsed by sanitize-html.
 * @returns The same tag with the rewritten attributes, ordered as the
 *   untouched originals, then width, height, style, loading and decoding.
 */
function transformDescriptionImage(
  tagName: string,
  attribs: sanitizeHtml.Attributes,
): sanitizeHtml.Tag {
  const size = extractImageSize(attribs["style"] ?? "");
  const width = size.width ?? attribs[ImageDimension.Width];
  const height = size.height ?? attribs[ImageDimension.Height];
  const preserved = Object.fromEntries(
    Object.entries(attribs).filter(
      ([name]) => !MANAGED_IMAGE_ATTRIBUTES.has(name),
    ),
  );

  return {
    tagName,
    attribs: {
      ...preserved,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
      ...(size.remainingStyle === "" ? {} : { style: size.remainingStyle }),
      loading: "lazy",
      decoding: "async",
    },
  };
}

const DESCRIPTION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "font"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height", "style", "loading", "decoding"],
    font: ["face"],
    "*": ["class", "style"],
  },
  allowedSchemes: ["https", "http"],
  transformTags: {
    img: transformDescriptionImage,
  },
};

/**
 * Sanitizes a problem description's HTML once, at fetch time, since
 * descriptions are later rendered with dangerouslySetInnerHTML. The
 * allowlist covers every tag/attribute observed across the committed
 * archive; scripts, event handlers, unsafe URL schemes and editor metadata
 * like `data-*` are dropped. Images get their inline pixel size moved into
 * `width`/`height` attributes plus lazy loading and async decoding, so they
 * scale without distortion in narrow panels. The output is a fixed point:
 * sanitizing it again returns it unchanged, which lets the archive be
 * re-sanitized safely.
 *
 * @param html The raw (or previously sanitized) description HTML.
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
 * @returns The problem ready to be written to `data/problems`, with the
 *   title trimmed, since LeetCode occasionally serves one with stray
 *   surrounding whitespace that would otherwise leak into page titles.
 */
export function buildProblem(
  challenge: DailyChallenge,
  description: string,
): Problem {
  const { title, difficulty } = challenge.question;

  return {
    title: title.trim(),
    difficulty,
    description: sanitizeDescription(description),
    link: normalizeLink(challenge.link),
    date: challenge.date,
  };
}
