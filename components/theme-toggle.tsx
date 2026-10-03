"use client";

import { Button } from "@/components/ui/button";
import {
  applyResolvedTheme,
  applyTheme,
  oppositeTheme,
  readAppliedTheme,
  readStoredTheme,
  subscribeToAppliedTheme,
  SYSTEM_DARK_QUERY,
  Theme,
  THEME_STORAGE_KEY,
  writeTheme,
} from "@/lib/theme";
import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

let sessionTheme: Theme | null = null;

/**
 * Reads whether the document is in the dark theme, for `aria-pressed`.
 *
 * @returns True when `<html>` carries the dark class.
 */
function isDarkApplied(): boolean {
  return readAppliedTheme() === Theme.Dark;
}

/**
 * Stands in for the theme during server rendering, where it cannot be known;
 * the client corrects it right after hydration.
 *
 * @returns False, so the server renders the toggle as not pressed.
 */
function isDarkOnServer(): boolean {
  return false;
}

/**
 * Floating button in the bottom-right corner that switches between the light
 * and dark themes and remembers the choice. It sits 20px from the edges, the
 * same inset Next.js gives its dev indicator in the opposite corner. It shows
 * a moon in light mode and a sun in dark mode, in the inverse of the page's
 * colors: dark in light mode, light in dark mode. To assistive technology it
 * is a "Dark theme" toggle button whose `aria-pressed` tracks the applied
 * theme; the label stays fixed while the pressed state changes, as the
 * WAI-ARIA button pattern requires of toggles. The restore script in the root
 * layout has already applied the right theme before first paint, so the icon
 * is picked by the `dark:` variant in CSS rather than by React state: the
 * server and the first client render produce the same markup, and the button
 * never flickers. The pressed state cannot be known on the server, so it
 * renders as not pressed and is corrected right after hydration. On mount it
 * re-applies the theme before paint, in case React rebuilt `<html>` without
 * the class. Until the reader picks a theme the page keeps following the
 * system appearance; a choice made in another tab is picked up here as well,
 * and a choice storage could not keep still holds for the rest of the
 * session.
 *
 * @returns The theme toggle button.
 */
export function ThemeToggle() {
  const darkApplied = useSyncExternalStore(
    subscribeToAppliedTheme,
    isDarkApplied,
    isDarkOnServer,
  );

  useLayoutEffect(() => {
    applyResolvedTheme(sessionTheme);
  }, []);

  useEffect(() => {
    const systemDark = window.matchMedia(SYSTEM_DARK_QUERY);
    const onSystemChange = () => {
      if (sessionTheme === null && readStoredTheme() === null) {
        applyResolvedTheme();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        sessionTheme = null;
        applyResolvedTheme();
      }
    };

    systemDark.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      systemDark.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <Button
      size="icon-lg"
      aria-pressed={darkApplied}
      className="fixed right-5 bottom-5 z-50 cursor-pointer rounded-full bg-clip-border shadow-md hover:bg-primary print:hidden"
      onClick={() => {
        const next = oppositeTheme(readAppliedTheme());
        sessionTheme = next;
        writeTheme(next);
        applyTheme(next);
      }}
    >
      <Moon aria-hidden className="dark:hidden" />
      <Sun aria-hidden className="hidden dark:block" />
      <span className="sr-only">Dark theme</span>
    </Button>
  );
}
