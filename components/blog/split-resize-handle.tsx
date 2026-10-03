"use client";

import {
  clampLeftFractionToBounds,
  DEFAULT_LEFT_FRACTION,
  leftFractionBounds,
  type LeftFractionBounds,
  MAX_LEFT_FRACTION,
  MIN_LEFT_FRACTION,
} from "@/lib/split-storage";
import { cn } from "@/lib/utils";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

interface SplitResizeHandleProps {
  leftFraction: number;
  onFractionChange: (fraction: number) => void;
  onFractionCommit: (fraction: number) => void;
}

/** Where the two panels sit on screen while a drag is in progress. */
interface DragGeometry {
  /** Left edge of the left panel, in viewport pixels. */
  start: number;
  /** Width both panels share, excluding the separator. */
  panelsWidth: number;
  /** Half the separator's width, the offset from its center to its edge. */
  halfHandle: number;
}

const KEYBOARD_STEP = 0.02;

const FALLBACK_BOUNDS: LeftFractionBounds = {
  min: MIN_LEFT_FRACTION,
  max: MAX_LEFT_FRACTION,
};

/**
 * Measures the split range for the row a separator sits in.
 *
 * @param handle The separator element.
 * @returns The range that keeps both panels at least MIN_PANEL_WIDTH wide, or
 *   the fixed range when the separator has no parent row.
 */
function measureBounds(handle: HTMLElement): LeftFractionBounds {
  const row = handle.parentElement;

  if (!row) {
    return FALLBACK_BOUNDS;
  }

  return leftFractionBounds(
    row.getBoundingClientRect().width - handle.getBoundingClientRect().width,
  );
}

/**
 * Desktop-only separator that resizes the surrounding panels while dragged.
 * Arrow keys nudge the split, Home and End jump to its limits, double click and
 * Enter restore the even split. The limits track the row's width, so neither
 * panel can be dragged or nudged below MIN_PANEL_WIDTH. Intermediate drag positions are reported
 * through onFractionChange and only the resting position through
 * onFractionCommit, so a drag does not write to storage on every pointer move.
 *
 * @param leftFraction Current share of the container taken by the left panel.
 * @param onFractionChange Called with each transient share during a drag.
 * @param onFractionCommit Called with the share the user settled on.
 * @returns The separator element.
 */
export function SplitResizeHandle({
  leftFraction,
  onFractionChange,
  onFractionCommit,
}: SplitResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragGeometry = useRef<DragGeometry | null>(null);
  const [dragging, setDragging] = useState(false);
  const [bounds, setBounds] = useState<LeftFractionBounds>(FALLBACK_BOUNDS);

  useEffect(() => {
    const handle = handleRef.current;
    const row = handle?.parentElement;

    if (!handle || !row) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setBounds(measureBounds(handle));
    });
    observer.observe(row);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const { body } = document;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;

    body.style.cursor = "col-resize";
    body.style.userSelect = "none";

    return () => {
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [dragging]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    const row = handle.parentElement;

    if (!row) {
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const handleWidth = handle.getBoundingClientRect().width;

    dragGeometry.current = {
      start: rowRect.left,
      panelsWidth: rowRect.width - handleWidth,
      halfHandle: handleWidth / 2,
    };
    setBounds(measureBounds(handle));
    handle.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const geometry = dragGeometry.current;

    if (!geometry || geometry.panelsWidth <= 0) {
      return;
    }

    onFractionChange(
      clampLeftFractionToBounds(
        (event.clientX - geometry.start - geometry.halfHandle) /
          geometry.panelsWidth,
        bounds,
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragGeometry.current) {
      return;
    }

    dragGeometry.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragging(false);
    onFractionCommit(leftFraction);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onFractionCommit(
        clampLeftFractionToBounds(leftFraction - KEYBOARD_STEP, bounds),
      );
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onFractionCommit(
        clampLeftFractionToBounds(leftFraction + KEYBOARD_STEP, bounds),
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      onFractionCommit(bounds.min);
    } else if (event.key === "End") {
      event.preventDefault();
      onFractionCommit(bounds.max);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onFractionCommit(DEFAULT_LEFT_FRACTION);
    }
  }

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={Math.round(
        clampLeftFractionToBounds(leftFraction, bounds) * 100,
      )}
      aria-valuemin={Math.round(bounds.min * 100)}
      aria-valuemax={Math.round(bounds.max * 100)}
      tabIndex={0}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onFractionCommit(DEFAULT_LEFT_FRACTION)}
      onKeyDown={handleKeyDown}
      className="group hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-muted/30 outline-none hover:bg-accent lg:flex"
    >
      <div
        className={cn(
          "h-10 w-1 rounded-full bg-transparent transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary",
          dragging && "bg-primary",
        )}
      />
    </div>
  );
}
