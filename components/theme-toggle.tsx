"use client";

import { Button } from "@/components/ui/button";
import {
  applyResolvedTheme,
  applyTheme,
  oppositeTheme,
  readAppliedTheme,
  readStoredTheme,
  SYSTEM_DARK_QUERY,
  Theme,
  THEME_STORAGE_KEY,
  writeTheme,
} from "@/lib/theme";
import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect } from "react";

let sessionTheme: Theme | null = null;

/**
 * Floating button in the bottom-right corner that switches between the light
 * and dark themes and remembers the choice. It sits 20px from the edges, the
 * same inset Next.js gives its dev indicator in the opposite corner. It shows
 * a moon in light mode and a sun in dark mode, in the inverse of the page's
 * colors: dark in light mode, light in dark mode. The restore script in the
 * root layout has already applied the right theme before first paint, so the
 * icon and the screen-reader label are picked by the `dark:` variant in CSS
 * rather than by React state: the server and the first client render produce
 * the same markup, and the button never flickers. On mount it re-applies the
 * theme before paint, in case React rebuilt `<html>` without the class. Until
 * the reader picks a theme the page keeps following the system appearance; a
 * choice made in another tab is picked up here as well, and a choice storage
 * could not keep still holds for the rest of the session.
 *
 * @returns The theme toggle button.
 */
export function ThemeToggle() {
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
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </Button>
  );
}
