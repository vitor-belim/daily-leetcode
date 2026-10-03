"use client";

import { formatDate, formatDateTimeUTC } from "@/lib/date-display";
import { useSyncExternalStore } from "react";

export interface LocalDateTimeProps {
  /** The instant to show, as an ISO timestamp. */
  value: string;
}

/**
 * Stands in for the unsubscribe function of a store that never changes.
 */
function unsubscribeNever(): void {
  return undefined;
}

/**
 * Subscribes to the viewer's time zone, which cannot change while the page
 * is open, so the listener is never called.
 *
 * @returns A function that removes nothing.
 */
function subscribeNever(): () => void {
  return unsubscribeNever;
}

/**
 * Shows a timestamp in the viewer's own time zone. The server, which cannot
 * know that zone, renders the UTC time with a "UTC" label; hydration reuses
 * that text so the markup matches, and React then re-renders with the local
 * time. The machine-readable instant stays in the `dateTime` attribute
 * throughout.
 *
 * @param value The instant to show, as an ISO timestamp.
 * @returns The `<time>` element.
 */
export function LocalDateTime({ value }: LocalDateTimeProps) {
  const text = useSyncExternalStore(
    subscribeNever,
    () => formatDate(value),
    () => formatDateTimeUTC(value),
  );

  return <time dateTime={value}>{text}</time>;
}
