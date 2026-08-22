"use client";

import {
  type PanelConfig,
  PanelKey,
  PanelState,
  SplitPanel,
} from "@/components/blog/split-panel";
import { SplitResizeHandle } from "@/components/blog/split-resize-handle";
import { useSplitFraction } from "@/components/blog/use-split-fraction";
import { useState } from "react";

interface SplitPanelsProps {
  left: PanelConfig;
  right: PanelConfig;
}

/**
 * Renders the two problem panels side by side on desktop and stacked on mobile.
 * Desktop widths come from the persisted split and are moved by the separator
 * between the panels; mobile heights come from the per-panel
 * maximize/minimize/collapse controls.
 *
 * @param left Configuration of the leading panel.
 * @param right Configuration of the trailing panel.
 * @returns The panel pair with the separator between them.
 */
export function SplitPanels({ left, right }: SplitPanelsProps) {
  const [maximized, setMaximized] = useState<PanelKey | null>(null);
  const { leftFraction, setLeftFraction, commitLeftFraction } =
    useSplitFraction();

  return (
    <>
      <SplitPanel
        {...left}
        side={PanelKey.Left}
        state={
          maximized === PanelKey.Left
            ? PanelState.Maximized
            : maximized === PanelKey.Right
              ? PanelState.Collapsed
              : PanelState.Half
        }
        onMaximize={() => setMaximized(PanelKey.Left)}
        onMinimize={() => setMaximized(null)}
        onCollapse={() => setMaximized(PanelKey.Right)}
      />
      <SplitResizeHandle
        leftFraction={leftFraction}
        onFractionChange={setLeftFraction}
        onFractionCommit={commitLeftFraction}
      />
      <SplitPanel
        {...right}
        side={PanelKey.Right}
        state={
          maximized === PanelKey.Right
            ? PanelState.Maximized
            : maximized === PanelKey.Left
              ? PanelState.Collapsed
              : PanelState.Half
        }
        onMaximize={() => setMaximized(PanelKey.Right)}
        onMinimize={() => setMaximized(null)}
        onCollapse={() => setMaximized(PanelKey.Left)}
      />
    </>
  );
}
