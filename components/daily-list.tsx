"use client";

import { DailyRow } from "@/components/home/daily-row";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  appendDailiesPage,
  fetchDailiesPage,
  restoreDailyListState,
  type DailyListSnapshot,
  type DailyListState,
} from "@/lib/dailies-client";
import { formatMonthYear } from "@/lib/date-display";
import { monthOf } from "@/lib/dates";
import type { DailySummary } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DailyListProps {
  initialDailies: DailySummary[];
  initialHasMore: boolean;
  initialCursor: string | null;
  /** Today's `YYYY-MM` month, the only one expanded on first render. */
  currentMonth: string;
  total: number;
}

/** The consecutive days of one calendar month, newest first. */
interface MonthGroup {
  /** The month as `YYYY-MM`, used as the React key and accordion value. */
  key: string;
  label: string;
  dailies: DailySummary[];
}

/** Where the latest "Load previous month" request stands. */
enum LoadStatus {
  Idle = "idle",
  Loading = "loading",
  Failed = "failed",
}

/**
 * The list's state as of its last render, kept at module level so that it
 * outlives the component: navigating to a day and back remounts the list,
 * which then resumes with the months already loaded and expanded instead of
 * starting over. It is only ever written from an effect, so server renders
 * never touch it, and a full page load starts it empty, matching the server
 * HTML on hydration.
 */
let lastSnapshot: DailyListSnapshot | null = null;

/**
 * Records the list's latest state for the next mount to resume from.
 *
 * @param snapshot The state plus the seed it grew from.
 */
function rememberSnapshot(snapshot: DailyListSnapshot): void {
  lastSnapshot = snapshot;
}

/**
 * Splits a newest-first list of days into runs sharing a calendar month,
 * preserving order.
 */
function groupByMonth(dailies: DailySummary[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  for (const daily of dailies) {
    const key = monthOf(daily.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.dailies.push(daily);
    } else {
      groups.push({
        key,
        label: formatMonthYear(daily.date),
        dailies: [daily],
      });
    }
  }

  return groups;
}

/**
 * The home page's archive list: the server-rendered months grouped into
 * accordions, plus a "Load previous month" button that fetches older months
 * from the statically generated month pages. Loaded months and expanded
 * accordions survive navigating to a day and back.
 *
 * @param initialDailies The server-rendered days, newest first.
 * @param initialHasMore Whether any day is older than `initialDailies`.
 * @param initialCursor The cursor for the first older month, or null.
 * @param currentMonth Today's `YYYY-MM` month, expanded on first render.
 * @param total The archive-wide day count.
 * @returns The grouped list with its load button.
 */
export function DailyList({
  initialDailies,
  initialHasMore,
  initialCursor,
  currentMonth,
  total,
}: DailyListProps) {
  const [state, setState] = useState<DailyListState>(() =>
    restoreDailyListState(
      lastSnapshot,
      { cursor: initialCursor, hasMore: initialHasMore, total },
      currentMonth,
    ),
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(LoadStatus.Idle);

  useEffect(() => {
    rememberSnapshot({
      seed: { cursor: initialCursor, hasMore: initialHasMore, total },
      state,
    });
  }, [initialCursor, initialHasMore, total, state]);

  const dailies = [...initialDailies, ...state.olderDailies];
  const isLoading = loadStatus === LoadStatus.Loading;
  const idleLabel =
    loadStatus === LoadStatus.Failed ? "Try again" : "Load previous month";

  async function loadMore(): Promise<void> {
    const cursor = state.cursor;
    if (cursor === null) return;

    setLoadStatus(LoadStatus.Loading);
    try {
      const page = await fetchDailiesPage(cursor);
      setState((current) =>
        current.cursor === cursor ? appendDailiesPage(current, page) : current,
      );
      setLoadStatus(LoadStatus.Idle);
    } catch (error) {
      console.error("Failed to load more dailies:", error);
      setLoadStatus(LoadStatus.Failed);
    }
  }

  if (dailies.length === 0 && !state.hasMore) {
    return (
      <Card className="items-center border-dashed p-12 text-center shadow-none ring-0 border">
        <p className="text-muted-foreground italic">
          No daily challenges archived yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Accordion
        multiple
        value={state.openMonths}
        onValueChange={(value) =>
          setState((current) => ({
            ...current,
            openMonths: value.map(String),
          }))
        }
        className="gap-6"
      >
        {groupByMonth(dailies).map((group) => (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 not-last:border-b-0"
          >
            <AccordionTrigger className="rounded-none border-0 bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:no-underline focus-visible:ring-inset data-panel-open:border-b">
              <span className="flex items-baseline gap-2">
                {group.label}
                <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                  {group.dailies.length}{" "}
                  {group.dailies.length === 1 ? "day" : "days"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0 [&_a]:no-underline">
              <ul className="divide-y">
                {group.dailies.map((daily) => (
                  <li key={daily.date}>
                    <DailyRow daily={daily} />
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex flex-col items-center gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Showing {dailies.length} of {total} challenges
        </p>
        {loadStatus === LoadStatus.Failed && (
          <p role="alert" className="text-center text-xs text-destructive">
            Couldn&apos;t load the previous month. Check your connection and try
            again.
          </p>
        )}
        {state.hasMore && (
          <Button
            onClick={loadMore}
            disabled={isLoading}
            focusableWhenDisabled
            variant="outline"
            className="w-full aria-disabled:opacity-50 sm:w-auto sm:min-w-48"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Loading…
              </>
            ) : (
              idleLabel
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
