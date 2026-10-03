export const SPLIT_STORAGE_KEY = "daily-leetcode:split-left-fraction";
export const SPLIT_LEFT_VARIABLE = "--split-left";
export const DEFAULT_LEFT_FRACTION = 0.5;
export const MIN_LEFT_FRACTION = 0.2;
export const MAX_LEFT_FRACTION = 0.8;

/**
 * Narrowest a desktop panel may get, in CSS pixels. The panels mirror it with
 * a literal `lg:min-w-100` class, which Tailwind needs to see verbatim.
 */
export const MIN_PANEL_WIDTH = 400;

/** The range a split may take for a given container width. */
export interface LeftFractionBounds {
  min: number;
  max: number;
}

/**
 * Tightens the fixed split range for the space the panels actually share, so
 * that neither panel ends up narrower than MIN_PANEL_WIDTH: on a 1000px row the
 * 20% minimum would leave a 200px panel, so the minimum rises to 40% there.
 *
 * @param panelsWidth The width both panels share, excluding the separator, in
 *   CSS pixels.
 * @returns The allowed range of the left panel's share. When the row is too
 *   narrow to give both panels their minimum (or has no width at all), both
 *   bounds collapse to the even split.
 */
export function leftFractionBounds(panelsWidth: number): LeftFractionBounds {
  const minimumShare =
    panelsWidth > 0 ? MIN_PANEL_WIDTH / panelsWidth : Number.POSITIVE_INFINITY;
  const min = Math.max(MIN_LEFT_FRACTION, minimumShare);
  const max = Math.min(MAX_LEFT_FRACTION, 1 - minimumShare);

  return min <= max
    ? { min, max }
    : { min: DEFAULT_LEFT_FRACTION, max: DEFAULT_LEFT_FRACTION };
}

/**
 * Restricts a split to a range from {@link leftFractionBounds}.
 *
 * @param fraction Desired share of the container taken by the left panel.
 * @param bounds The allowed range for the current container width.
 * @returns The fraction clamped to the range, or the range's midpoint when the
 *   input is not a finite number.
 */
export function clampLeftFractionToBounds(
  fraction: number,
  bounds: LeftFractionBounds,
): number {
  if (!Number.isFinite(fraction)) {
    return (bounds.min + bounds.max) / 2;
  }

  return Math.min(bounds.max, Math.max(bounds.min, fraction));
}

/**
 * Restricts a split to the range that keeps both panels usable. Every value
 * entering or leaving storage passes through here, so a split persisted by an
 * older range or edited by hand can never starve a panel.
 *
 * @param fraction Desired share of the container taken by the left panel.
 * @returns The fraction clamped to the allowed range, or the default split when
 *   the input is not a finite number.
 */
export function clampLeftFraction(fraction: number): number {
  if (!Number.isFinite(fraction)) {
    return DEFAULT_LEFT_FRACTION;
  }

  return Math.min(MAX_LEFT_FRACTION, Math.max(MIN_LEFT_FRACTION, fraction));
}

/**
 * Interprets a raw stored split, tolerating anything storage may hold.
 *
 * @param value The raw stored string, or null when the key is absent.
 * @returns The clamped split, or the default split when nothing usable is
 *   stored.
 */
export function parseLeftFraction(value: string | null): number {
  if (value === null) {
    return DEFAULT_LEFT_FRACTION;
  }

  return clampLeftFraction(Number.parseFloat(value));
}

/**
 * Reads the persisted split.
 *
 * @returns The clamped stored split, or the default split when nothing is
 *   stored or storage is unreachable, as in private modes that deny access.
 */
export function readLeftFraction(): number {
  try {
    return parseLeftFraction(window.localStorage.getItem(SPLIT_STORAGE_KEY));
  } catch {
    return DEFAULT_LEFT_FRACTION;
  }
}

/**
 * Persists a split so it survives reloads and navigation between problems.
 *
 * @param fraction Share of the container taken by the left panel.
 * @returns Whether the value was written; storage can be unreachable or full.
 */
export function writeLeftFraction(fraction: number): boolean {
  try {
    window.localStorage.setItem(
      SPLIT_STORAGE_KEY,
      clampLeftFraction(fraction).toFixed(4),
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Publishes a split to the document so the panels can size themselves from CSS
 * alone. Layout reads this variable rather than a React-rendered style, which
 * is what lets the restore script below place the split before first paint.
 *
 * @param fraction Share of the container taken by the left panel.
 */
export function applyLeftFraction(fraction: number): void {
  document.documentElement.style.setProperty(
    SPLIT_LEFT_VARIABLE,
    String(clampLeftFraction(fraction)),
  );
}

/**
 * A minified copy of read-then-apply, for a blocking inline script placed ahead
 * of the panels. It has to be a self-contained string because it runs while the
 * document is still parsing, long before any bundle is available. Leaving the
 * variable unset when nothing usable is stored is deliberate: the panels carry
 * the default split as a CSS fallback, which also covers a page rendered with
 * scripting disabled.
 */
export const SPLIT_RESTORE_SCRIPT = `(function(){try{var f=parseFloat(window.localStorage.getItem(${JSON.stringify(SPLIT_STORAGE_KEY)}));if(!isFinite(f))return;var c=Math.min(${MAX_LEFT_FRACTION},Math.max(${MIN_LEFT_FRACTION},f));document.documentElement.style.setProperty(${JSON.stringify(SPLIT_LEFT_VARIABLE)},String(c));}catch(e){}})()`;
