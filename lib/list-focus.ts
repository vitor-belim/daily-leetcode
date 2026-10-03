/**
 * Keys that move focus between the headers of a vertical list, as
 * `KeyboardEvent.key` reports them.
 */
export enum ListFocusKey {
  Next = "ArrowDown",
  Previous = "ArrowUp",
  First = "Home",
  Last = "End",
}

/**
 * Recognizes a list navigation key.
 *
 * @param key A `KeyboardEvent.key` value.
 * @returns The matching navigation key, or null for any other key.
 */
export function toListFocusKey(key: string): ListFocusKey | null {
  return (
    Object.values(ListFocusKey).find((candidate) => candidate === key) ?? null
  );
}

/**
 * Picks the item a navigation key moves focus to in a vertical list that
 * wraps around at both ends: the behaviour Base UI's Accordion gave its
 * triggers before 1.6 (`loopFocus` on by default). Up from the first item
 * goes to the last, Down from the last goes to the first, and Home/End jump
 * to either end.
 *
 * @param key The navigation key pressed.
 * @param currentIndex Index of the focused item. Any index outside the list,
 *   such as -1 when focus is not on one of the items, counts as being
 *   outside it: Down then lands on the first item and Up on the last.
 * @param count How many focusable items the list has.
 * @returns The index to focus, or null when the list is empty.
 */
export function resolveListFocusIndex(
  key: ListFocusKey,
  currentIndex: number,
  count: number,
): number | null {
  if (count < 1) return null;

  const lastIndex = count - 1;
  switch (key) {
    case ListFocusKey.Next:
      return currentIndex < 0 || currentIndex >= lastIndex
        ? 0
        : currentIndex + 1;
    case ListFocusKey.Previous:
      return currentIndex <= 0 || currentIndex > lastIndex
        ? lastIndex
        : currentIndex - 1;
    case ListFocusKey.First:
      return 0;
    case ListFocusKey.Last:
      return lastIndex;
  }
}
