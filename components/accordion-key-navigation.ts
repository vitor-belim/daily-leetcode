import { resolveListFocusIndex, toListFocusKey } from "@/lib/list-focus";
import type { KeyboardEvent } from "react";

const ACCORDION_SELECTOR = '[data-slot="accordion"]';
const TRIGGER_SELECTOR = '[data-slot="accordion-trigger"]';
const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"], [data-disabled]';

/**
 * Lists an accordion's enabled triggers in document order, leaving out those
 * of any accordion nested inside its panels.
 *
 * @param root The accordion root element.
 * @returns The triggers keyboard navigation can move between.
 */
function enabledTriggers(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll(TRIGGER_SELECTOR)).filter(
    (trigger): trigger is HTMLElement =>
      trigger instanceof HTMLElement &&
      trigger.closest(ACCORDION_SELECTOR) === root &&
      !trigger.matches(DISABLED_SELECTOR),
  );
}

/**
 * `onKeyDown` handler for an `Accordion` root that restores the header
 * navigation Base UI removed in 1.6, when it followed the WAI-ARIA APG
 * update dropping roving focus from the accordion pattern: while an enabled
 * trigger has focus, Up/Down move to the previous/next enabled trigger
 * (wrapping around) and Home/End jump to the first/last. It is an extra on
 * top of the pattern's Tab order, which stays untouched. Keys pressed
 * elsewhere in the panels, with a modifier held, on a disabled trigger or on
 * a nested accordion's triggers are left alone, and a handled key doesn't
 * also scroll the page.
 *
 * @param event The key event, bubbled up to the accordion root.
 */
export function handleAccordionKeyNavigation(
  event: KeyboardEvent<HTMLElement>,
): void {
  const key = toListFocusKey(event.key);
  if (
    key === null ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  const root = event.currentTarget;
  const focused = event.target;
  if (
    !(focused instanceof HTMLElement) ||
    !focused.matches(TRIGGER_SELECTOR) ||
    focused.matches(DISABLED_SELECTOR) ||
    focused.closest(ACCORDION_SELECTOR) !== root
  ) {
    return;
  }

  const triggers = enabledTriggers(root);
  const index = resolveListFocusIndex(
    key,
    triggers.indexOf(focused),
    triggers.length,
  );
  const next = index === null ? undefined : triggers[index];
  if (next === undefined) return;

  event.preventDefault();
  next.focus();
}
