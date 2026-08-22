"use client";

import {
  applyLeftFraction,
  DEFAULT_LEFT_FRACTION,
  readLeftFraction,
  writeLeftFraction,
} from "@/lib/split-storage";
import { useSyncExternalStore } from "react";

interface SplitFraction {
  leftFraction: number;
  setLeftFraction: (fraction: number) => void;
  commitLeftFraction: (fraction: number) => void;
}

const listeners = new Set<() => void>();

let currentLeftFraction: number | null = null;

/**
 * Reads the split for a client render, restoring the persisted one the first
 * time it is asked for. The value matches what the inline restore script
 * already published to the document, so adopting it moves nothing on screen.
 *
 * @returns The share of the container currently taken by the left panel.
 */
function getSnapshot(): number {
  if (currentLeftFraction === null) {
    currentLeftFraction = readLeftFraction();
  }

  return currentLeftFraction;
}

/**
 * Reads the split for a server render, where no stored value is reachable.
 *
 * @returns The default even split.
 */
function getServerSnapshot(): number {
  return DEFAULT_LEFT_FRACTION;
}

/**
 * Registers a listener for split changes, as required by useSyncExternalStore.
 *
 * @param listener Called whenever the split changes.
 * @returns A function that removes the listener.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Moves the split without persisting it, for transient drag positions.
 *
 * @param fraction Share of the container taken by the left panel.
 */
function setLeftFraction(fraction: number): void {
  currentLeftFraction = fraction;
  applyLeftFraction(fraction);

  for (const listener of listeners) {
    listener();
  }
}

/**
 * Moves the split and persists it, for a share the user settled on.
 *
 * @param fraction Share of the container taken by the left panel.
 */
function commitLeftFraction(fraction: number): void {
  setLeftFraction(fraction);
  writeLeftFraction(fraction);
}

/**
 * Subscribes to the split shared by every panel pair on the page. The split
 * lives outside React because the document owns it first: an inline script
 * applies the persisted value before hydration, and this store adopts it rather
 * than re-imposing a default.
 *
 * @returns The current split and the two ways to move it.
 */
export function useSplitFraction(): SplitFraction {
  const leftFraction = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return { leftFraction, setLeftFraction, commitLeftFraction };
}
