"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpandIcon, ShrinkIcon, SquareSplitVerticalIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

type PanelKey = "left" | "right";

enum PanelState {
  Half = "half",
  Maximized = "maximized",
  Collapsed = "collapsed",
}

type PanelConfig = {
  title: string;
  content: ReactNode;
  className?: string;
};

export function SplitPanels({
  left,
  right,
}: {
  left: PanelConfig;
  right: PanelConfig;
}) {
  const [maximized, setMaximized] = useState<PanelKey | null>(null);

  return (
    <>
      <Panel
        {...left}
        state={
          maximized === "left"
            ? PanelState.Maximized
            : maximized === "right"
              ? PanelState.Collapsed
              : PanelState.Half
        }
        onMaximize={() => setMaximized("left")}
        onMinimize={() => setMaximized(null)}
        onCollapse={() => setMaximized("right")}
      />
      <Panel
        {...right}
        state={
          maximized === "right"
            ? PanelState.Maximized
            : maximized === "left"
              ? PanelState.Collapsed
              : PanelState.Half
        }
        onMaximize={() => setMaximized("right")}
        onMinimize={() => setMaximized(null)}
        onCollapse={() => setMaximized("left")}
      />
    </>
  );
}

function Panel({
  title,
  content,
  className,
  state,
  onMaximize,
  onMinimize,
  onCollapse,
}: PanelConfig & {
  state: PanelState;
  onMaximize: () => void;
  onMinimize: () => void;
  onCollapse: () => void;
}) {
  const open = state !== PanelState.Collapsed;

  return (
    <section
      className={cn("flex flex-col overflow-hidden lg:flex-1!", className)}
      style={{
        flexGrow: open ? 1 : 0,
        flexShrink: 1,
        flexBasis: "0%",
        minHeight: "3rem",
        transitionProperty: "flex-grow",
        transitionDuration: "300ms",
        transitionTimingFunction: "ease",
      }}
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
