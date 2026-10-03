"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpandIcon, ShrinkIcon, SquareSplitVerticalIcon } from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";

export enum PanelKey {
  Left = "left",
  Right = "right",
}

export enum PanelState {
  Half = "half",
  Maximized = "maximized",
  Collapsed = "collapsed",
}

export interface PanelConfig {
  title: string;
  content: ReactNode;
  className?: string;
}

/** The mobile sizing actions a panel's control bar offers. */
export interface PanelControls {
  onMaximize: () => void;
  onMinimize: () => void;
  onCollapse: () => void;
}

export interface SplitPanelProps extends PanelConfig {
  side: PanelKey;
  state: PanelState;
  /**
   * Mobile sizing controls. A panel without them has no bar and collapses
   * all the way to nothing.
   */
  controls?: PanelControls;
}

/**
 * Desktop widths, taken straight from the custom property the restore script
 * and the resize handle both write. Reading layout from CSS rather than from a
 * React-rendered style is what lets a persisted split be in place on first
 * paint. The fallback repeats DEFAULT_LEFT_FRACTION because a class name has to
 * be a literal for Tailwind to find it; it also keeps the panels sized when
 * scripting is disabled and the property is never written. `lg:min-w-100`
 * mirrors MIN_PANEL_WIDTH (400px) for the same reason, holding the floor on
 * first paint and when the window narrows under a persisted split.
 */
const GROW_CLASSES: Record<PanelKey, string> = {
  [PanelKey.Left]: "lg:min-w-100 lg:grow-[var(--split-left,0.5)]!",
  [PanelKey.Right]: "lg:min-w-100 lg:grow-[calc(1_-_var(--split-left,0.5))]!",
};

/**
 * Renders a single panel, with its mobile sizing controls when it has any.
 * The panel's name is a visually hidden heading, so screen readers can still
 * find and announce it while the page shows only the content; the bar
 * carrying the controls exists on mobile alone, since desktop has nothing to
 * put in it. A collapsed panel keeps just that bar, or vanishes when it has
 * none. The flex-grow
 * transition animates the mobile maximize/collapse controls and is switched off
 * on desktop, where the width has to track the pointer during a drag.
 *
 * @param title Panel name, announced as its heading and used in the control
 *   labels.
 * @param content Body rendered under the panel bar.
 * @param className Extra classes applied to the panel container.
 * @param side Which half of the split this panel occupies.
 * @param state Current mobile sizing state of this panel.
 * @param controls The maximize, share-height and collapse actions behind the
 *   mobile control bar, or undefined for a panel without one.
 * @returns The panel element.
 */
export function SplitPanel({
  title,
  content,
  className,
  side,
  state,
  controls,
}: SplitPanelProps) {
  const open = state !== PanelState.Collapsed;

  const style: CSSProperties = {
    flexGrow: open ? 1 : 0,
    flexShrink: 1,
    flexBasis: "0%",
    minHeight: controls ? "3rem" : 0,
    transitionProperty: "flex-grow",
    transitionDuration: "300ms",
    transitionTimingFunction: "ease",
  };

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden lg:transition-none!",
        GROW_CLASSES[side],
        className,
      )}
      style={style}
    >
      <h2 className="sr-only">{title}</h2>
      {controls && (
        <div className="h-12 px-4 border-b bg-muted/30 shrink-0 w-full flex items-center justify-end lg:hidden">
          <div className="flex items-center gap-0">
            <Button
              type="button"
              onClick={controls.onCollapse}
              aria-label={`Collapse ${title}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={state === PanelState.Collapsed}
              size="icon"
              variant="ghost"
            >
              <ShrinkIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              onClick={controls.onMinimize}
              aria-label={`Minimize ${title}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={state === PanelState.Half}
              size="icon"
              variant="ghost"
            >
              <SquareSplitVerticalIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              onClick={controls.onMaximize}
              aria-label={`Maximize ${title}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={state === PanelState.Maximized}
              size="icon"
              variant="ghost"
            >
              <ExpandIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        {content}
      </div>
    </section>
  );
}
