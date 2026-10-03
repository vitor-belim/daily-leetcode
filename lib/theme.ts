/** The two color themes the site renders in. */
export enum Theme {
  Light = "light",
  Dark = "dark",
}

/** localStorage key holding the reader's explicit theme choice. */
export const THEME_STORAGE_KEY = "daily-leetcode:theme";

/**
 * Class on `<html>` that switches the palette, matching the `dark` custom
 * variant (`&:is(.dark *)`) and the `.dark` token block in `app/globals.css`.
 */
export const DARK_THEME_CLASS = "dark";

/** Media query matching an operating system set to a dark appearance. */
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Interprets a raw stored theme, tolerating anything storage may hold.
 *
 * @param value The raw stored string, or null when the key is absent.
 * @returns The stored theme, or null when nothing valid is stored.
 */
export function parseTheme(value: string | null): Theme | null {
  return Object.values(Theme).find((theme) => theme === value) ?? null;
}

/**
 * Picks the theme to render: an explicit choice wins, otherwise the
 * operating system's appearance is followed.
 *
 * @param stored The theme the reader picked, or null when they never did.
 * @param systemPrefersDark Whether the operating system asks for dark.
 * @returns The theme to apply.
 */
export function resolveTheme(
  stored: Theme | null,
  systemPrefersDark: boolean,
): Theme {
  return stored ?? (systemPrefersDark ? Theme.Dark : Theme.Light);
}

/**
 * Gives the theme a toggle switches to.
 *
 * @param theme The theme currently applied.
 * @returns The other theme.
 */
export function oppositeTheme(theme: Theme): Theme {
  return theme === Theme.Dark ? Theme.Light : Theme.Dark;
}

/**
 * Reads the reader's explicit theme choice.
 *
 * @returns The stored theme, or null when none is stored or storage is
 *   unreachable, as in private modes that deny access.
 */
export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Persists an explicit theme choice so it survives reloads and applies on
 * every page.
 *
 * @param theme The chosen theme.
 * @returns Whether the value was written; storage can be unreachable or full.
 */
export function writeTheme(theme: Theme): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reports whether the operating system currently asks for a dark appearance.
 *
 * @returns True when the dark color-scheme media query matches.
 */
export function systemPrefersDark(): boolean {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

/**
 * Reads the theme the document is currently rendered in.
 *
 * @returns Dark when `<html>` carries the dark class, otherwise light.
 */
export function readAppliedTheme(): Theme {
  return document.documentElement.classList.contains(DARK_THEME_CLASS)
    ? Theme.Dark
    : Theme.Light;
}

/**
 * Renders the document in a theme: toggles the dark class the stylesheet
 * keys off, and sets `color-scheme` so native scrollbars and form controls
 * match.
 *
 * @param theme The theme to apply.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle(DARK_THEME_CLASS, theme === Theme.Dark);
  root.style.colorScheme = theme;
}

/**
 * Watches the document for theme changes, whatever caused them: the toggle,
 * another tab and the system appearance all end up flipping the dark class on
 * `<html>`, so observing that class catches every one of them.
 *
 * @param listener Called after each change to `<html>`'s class list.
 * @returns A function that stops watching.
 */
export function subscribeToAppliedTheme(listener: () => void): () => void {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    observer.disconnect();
  };
}

/**
 * Applies the theme a reader gets on a fresh load: an explicit choice wins,
 * then the stored one, then the operating system's appearance. Called on
 * mount to re-assert what the restore script set, since React strips
 * attributes it did not render from `<html>` whenever it client-renders the
 * root, as when `app/global-error.tsx` replaces the layout.
 *
 * @param choice A choice made this session that storage may have failed to
 *   keep, or null to rely on storage alone.
 * @returns The theme applied.
 */
export function applyResolvedTheme(choice: Theme | null = null): Theme {
  const theme = resolveTheme(choice ?? readStoredTheme(), systemPrefersDark());
  applyTheme(theme);
  return theme;
}

/**
 * A minified copy of resolve-then-apply, for a blocking inline script placed
 * ahead of the page content so the stored or system theme is in place before
 * first paint, with no flash of the light palette. Like the split restore
 * script it must be a self-contained string, since it runs while the document
 * is still parsing. The storage read is guarded on its own so that, like
 * `readStoredTheme`, blocked storage still falls back to the system
 * appearance. Without scripting the page stays light, the stylesheet's
 * default.
 */
export const THEME_RESTORE_SCRIPT = `(function(){var t=null;try{t=window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}try{var d=t===${JSON.stringify(Theme.Dark)}||(t!==${JSON.stringify(Theme.Light)}&&window.matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches);var r=document.documentElement;r.classList.toggle(${JSON.stringify(DARK_THEME_CLASS)},d);r.style.colorScheme=d?${JSON.stringify(Theme.Dark)}:${JSON.stringify(Theme.Light)};}catch(e){}})()`;
