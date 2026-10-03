import { Difficulty } from "@/lib/types";

/**
 * The light-theme tokens from `app/globals.css`, as the hex values the image
 * renderer understands (it does not parse `oklch()`).
 */
export interface OgPalette {
  background: string;
  foreground: string;
  muted: string;
  primary: string;
  primaryForeground: string;
}

/** Colors of one difficulty pill, plus the accent bar under its card. */
export interface OgDifficultyTone {
  background: string;
  foreground: string;
  accent: string;
}

/** Site palette shared by the Open Graph cards and the generated icons. */
export const OG_PALETTE: OgPalette = {
  background: "#fbfbfb",
  foreground: "#0a0a0a",
  muted: "#737373",
  primary: "#171717",
  primaryForeground: "#fafafa",
};

/**
 * Difficulty colors matching `DifficultyBadge`: emerald for Easy, amber for
 * Medium and the destructive red for Hard.
 */
export const OG_DIFFICULTY_TONES: Record<Difficulty, OgDifficultyTone> = {
  [Difficulty.Easy]: {
    background: "#d0fae5",
    foreground: "#005f46",
    accent: "#00bc7d",
  },
  [Difficulty.Medium]: {
    background: "#fef3c6",
    foreground: "#973c00",
    accent: "#fe9a00",
  },
  [Difficulty.Hard]: {
    background: "#ffe2e2",
    foreground: "#c10007",
    accent: "#e7000b",
  },
};
