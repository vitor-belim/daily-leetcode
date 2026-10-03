import { OG_PALETTE } from "./palette";

/** Corner radius of the rounded tile, in the monogram's 32-unit grid. */
export const MONOGRAM_ROUNDED_CORNERS = 7;

/** Corner radius of a full-bleed tile, for platforms that mask it themselves. */
export const MONOGRAM_SQUARE_CORNERS = 0;

interface MonogramProps {
  /** Rendered width and height in pixels. */
  size: number;
  /** Tile corner radius in the 32-unit grid. */
  cornerRadius: number;
}

/**
 * The site's "DL" monogram: Daily LeetCode's initials drawn as strokes on a
 * primary-colored tile, so it renders identically without any font. The
 * same drawing backs `app/icon.svg` and `app/favicon.ico` (pre-rendered by
 * `npm run generate-icons`), the Apple touch icon and the header of every
 * Open Graph card.
 *
 * @param size Rendered width and height in pixels.
 * @param cornerRadius Tile corner radius in the 32-unit grid.
 * @returns The monogram as an `<svg>` element.
 */
export function Monogram({ size, cornerRadius }: MonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="32"
        height="32"
        rx={cornerRadius}
        fill={OG_PALETTE.primary}
      />
      <path
        d="M6.5 9H8.5A7 7 0 0 1 8.5 23H6.5ZM20.5 9V23H25.5"
        fill="none"
        stroke={OG_PALETTE.primaryForeground}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
