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
import { getLatestDailies } from "@/lib/actions";
import { formatMonthYear } from "@/lib/date-display";
import { monthOf } from "@/lib/dates";
import type { DailySummary } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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

/** The distinct months present in a list of days, in list order. */
function monthKeys(dailies: DailySummary[]): string[] {
  return [...new Set(dailies.map((d) => monthOf(d.date)))];
}

export function DailyList({
  initialDailies,
  initialHasMore,
  initialCursor,
  currentMonth,
  total,
}: DailyListProps) {
  const [dailies, setDailies] = useState<DailySummary[]>(initialDailies);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [openMonths, setOpenMonths] = useState<string[]>([currentMonth]);

  async function loadMore() {
    setIsLoading(true);
    try {
      const result = await getLatestDailies(1, cursor);
      setDailies((prev) => [...prev, ...result.dailies]);
      setOpenMonths((prev) => [
        ...new Set([...prev, ...monthKeys(result.dailies)]),
      ]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to load more dailies:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (dailies.length === 0) {
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
        value={openMonths}
        onValueChange={(value) => setOpenMonths(value.map(String))}
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
        <p className="text-xs text-muted-foreground">
          Showing {dailies.length} of {total} challenges
        </p>
        {hasMore && (
          <Button
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto sm:min-w-48"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Loading…
              </>
            ) : (
              "Load previous month"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
