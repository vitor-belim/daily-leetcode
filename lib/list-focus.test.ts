import { describe, it, expect } from "vitest";
import {
  ListFocusKey,
  resolveListFocusIndex,
  toListFocusKey,
} from "./list-focus";

describe("toListFocusKey", () => {
  it.each([
    ["ArrowDown", ListFocusKey.Next],
    ["ArrowUp", ListFocusKey.Previous],
    ["Home", ListFocusKey.First],
    ["End", ListFocusKey.Last],
  ])("maps %s to its navigation key", (key, expected) => {
    expect(toListFocusKey(key)).toBe(expected);
  });

  it.each(["ArrowLeft", "ArrowRight", "Tab", "Enter", " ", "arrowdown"])(
    "ignores %j",
    (key) => {
      // Horizontal arrows did nothing on the vertical accordion either, and
      // KeyboardEvent.key is case-sensitive.
      expect(toListFocusKey(key)).toBeNull();
    },
  );
});

describe("resolveListFocusIndex", () => {
  it("moves down and up one item at a time", () => {
    expect(resolveListFocusIndex(ListFocusKey.Next, 1, 4)).toBe(2);
    expect(resolveListFocusIndex(ListFocusKey.Previous, 2, 4)).toBe(1);
  });

  it("wraps around at both ends", () => {
    expect(resolveListFocusIndex(ListFocusKey.Next, 3, 4)).toBe(0);
    expect(resolveListFocusIndex(ListFocusKey.Previous, 0, 4)).toBe(3);
  });

  it("jumps to the first and last item", () => {
    expect(resolveListFocusIndex(ListFocusKey.First, 2, 4)).toBe(0);
    expect(resolveListFocusIndex(ListFocusKey.Last, 1, 4)).toBe(3);
  });

  it("keeps focus on a single item", () => {
    for (const key of Object.values(ListFocusKey)) {
      expect(resolveListFocusIndex(key, 0, 1)).toBe(0);
    }
  });

  it("enters the list from outside it at the nearest end", () => {
    // -1 means the focused element isn't one of the items, e.g. it was just
    // disabled; Down lands on the first item and Up on the last.
    expect(resolveListFocusIndex(ListFocusKey.Next, -1, 4)).toBe(0);
    expect(resolveListFocusIndex(ListFocusKey.Previous, -1, 4)).toBe(3);
  });

  it("treats an index past the end as outside the list too", () => {
    // A stale index, e.g. after the list shrank, must still land inside it.
    expect(resolveListFocusIndex(ListFocusKey.Next, 7, 4)).toBe(0);
    expect(resolveListFocusIndex(ListFocusKey.Previous, 7, 4)).toBe(3);
  });

  it("returns null for an empty list", () => {
    for (const key of Object.values(ListFocusKey)) {
      expect(resolveListFocusIndex(key, -1, 0)).toBeNull();
    }
  });
});
