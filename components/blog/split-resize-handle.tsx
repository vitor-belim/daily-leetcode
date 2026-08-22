"use client";

import {
  clampLeftFraction,
  DEFAULT_LEFT_FRACTION,
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

const KEYBOARD_STEP = 0.02;

/**
 * Desktop-only separator that resizes the surrounding panels while dragged.
 * Arrow keys nudge the split, Home and End jump to its limits, double click and
 * Enter restore the even split. Intermediate drag positions are reported
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
  const containerRect = useRef<DOMRect | null>(null);
  const [dragging, setDragging] = useState(false);

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
    const container = event.currentTarget.parentElement;

    if (!container) {
      return;
    }

    containerRect.current = container.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const rect = containerRect.current;

    if (!rect || rect.width === 0) {
      return;
    }

    onFractionChange(
      clampLeftFraction((event.clientX - rect.left) / rect.width),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!containerRect.current) {
      return;
    }

    containerRect.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragging(false);
    onFractionCommit(leftFraction);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onFractionCommit(clampLeftFraction(leftFraction - KEYBOARD_STEP));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onFractionCommit(clampLeftFraction(leftFraction + KEYBOARD_STEP));
    } else if (event.key === "Home") {
      event.preventDefault();
      onFractionCommit(MIN_LEFT_FRACTION);
    } else if (event.key === "End") {
      event.preventDefault();
      onFractionCommit(MAX_LEFT_FRACTION);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onFractionCommit(DEFAULT_LEFT_FRACTION);
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={Math.round(leftFraction * 100)}
      aria-valuemin={Math.round(MIN_LEFT_FRACTION * 100)}
      aria-valuemax={Math.round(MAX_LEFT_FRACTION * 100)}
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
