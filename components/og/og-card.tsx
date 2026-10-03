import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Difficulty } from "@/lib/types";
import { Monogram, MONOGRAM_ROUNDED_CORNERS } from "./monogram";
import { OG_DIFFICULTY_TONES, OG_PALETTE } from "./palette";

/** Pixel dimensions of a generated image. */
export interface OgImageSize {
  width: number;
  height: number;
}

/** The 1.91:1 size every Open Graph and Twitter card consumer accepts. */
export const OG_IMAGE_SIZE: OgImageSize = { width: 1200, height: 630 };

/** MIME type of every generated Open Graph image. */
export const OG_IMAGE_CONTENT_TYPE = "image/png";

/** Title length above which the card steps down to a smaller title size. */
const LONG_TITLE_LENGTH = 40;

/** The site's host as readers type it, without the `www.` prefix. */
const DISPLAY_HOST = SITE_URL.hostname.replace(/^www\./, "");

interface OgCardProps {
  title: string;
  /** The line under the title: a challenge's date or the site description. */
  detail: string;
  /** Shown as a colored pill before the detail, and tints the accent bar. */
  difficulty?: Difficulty;
}

/**
 * The 1200x630 social card shared by the site-wide and per-challenge Open
 * Graph images: the monogram and site name on top, a large title, and a
 * detail line led by an optional difficulty pill. Styles are inline flexbox
 * because the image renderer supports no other layout.
 *
 * @param title The large title: a challenge's name or the site title.
 * @param detail The line under the title.
 * @param difficulty The challenge's difficulty, when the card is for one.
 * @returns The card element, sized to fill a 1200x630 image.
 */
export function OgCard({ title, detail, difficulty }: OgCardProps) {
  const tone =
    difficulty === undefined ? null : OG_DIFFICULTY_TONES[difficulty];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "72px 80px 84px",
        background: OG_PALETTE.background,
        color: OG_PALETTE.foreground,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 26,
          color: OG_PALETTE.muted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Monogram size={64} cornerRadius={MONOGRAM_ROUNDED_CORNERS} />
          <span style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
            {SITE_NAME}
          </span>
        </div>
        <span>{DISPLAY_HOST}</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: title.length > LONG_TITLE_LENGTH ? 64 : 80,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 32,
            lineHeight: 1.35,
            color: OG_PALETTE.muted,
          }}
        >
          {tone !== null && difficulty !== undefined && (
            <span
              style={{
                display: "flex",
                flexShrink: 0,
                padding: "6px 24px",
                borderRadius: 999,
                background: tone.background,
                color: tone.foreground,
              }}
            >
              {difficulty}
            </span>
          )}
          <span>{detail}</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 12,
          background: tone?.accent ?? OG_PALETTE.primary,
        }}
      />
    </div>
  );
}
