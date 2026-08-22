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

export interface SplitPanelProps extends PanelConfig {
  side: PanelKey;
  state: PanelState;
  onMaximize: () => void;
  onMinimize: () => void;
  onCollapse: () => void;
}

/**
 * Desktop widths, taken straight from the custom property the restore script
 * and the resize handle both write. Reading layout from CSS rather than from a
 * React-rendered style is what lets a persisted split be in place on first
 * paint. The fallback repeats DEFAULT_LEFT_FRACTION because a class name has to
 * be a literal for Tailwind to find it; it also keeps the panels sized when
 * scripting is disabled and the property is never written.
 */
const GROW_CLASSES: Record<PanelKey, string> = {
  [PanelKey.Left]: "lg:grow-[var(--split-left,0.5)]!",
  [PanelKey.Right]: "lg:grow-[calc(1_-_var(--split-left,0.5))]!",
};

/**
 * Renders a single titled panel with its mobile sizing controls. The flex-grow
 * transition animates the mobile maximize/collapse controls and is switched off
 * on desktop, where the width has to track the pointer during a drag.
 *
 * @param title Heading shown in the panel bar.
 * @param content Body rendered under the panel bar.
 * @param className Extra classes applied to the panel container.
 * @param side Which half of the split this panel occupies.
 * @param state Current mobile sizing state of this panel.
 * @param onMaximize Called when the panel should take the full height.
 * @param onMinimize Called when both panels should share the height.
 * @param onCollapse Called when the panel should shrink to its bar.
 * @returns The panel element.
 */
export function SplitPanel({
  title,
  content,
  className,
  side,
  state,
  onMaximize,
  onMinimize,
  onCollapse,
}: SplitPanelProps) {
  const open = state !== PanelState.Collapsed;

  const style: CSSProperties = {
    flexGrow: open ? 1 : 0,
    flexShrink: 1,
    flexBasis: "0%",
    minHeight: "3rem",
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
      <div className="h-12 px-4 border-b bg-muted/30 shrink-0 w-full flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-0 lg:hidden">
          <Button
            type="button"
            onClick={onCollapse}
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
            onClick={onMinimize}
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
            onClick={onMaximize}
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

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        {content}
      </div>
    </section>
  );
}
