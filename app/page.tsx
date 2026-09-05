import { DailyList } from "@/components/daily-list";
import { StatsOverview } from "@/components/home/stats-overview";
import { Button } from "@/components/ui/button";
import { getArchiveStats, getDailySummariesByMonth } from "@/lib/dailies-repo";
import { formatMonthUTC, todayUTC } from "@/lib/dates";
import { ExternalLink } from "lucide-react";

const INITIAL_MONTHS = 7;

export default async function HomePage() {
  const [{ dailies, hasMore, nextCursor, total }, stats] = await Promise.all([
    getDailySummariesByMonth(INITIAL_MONTHS, null),
    getArchiveStats(),
  ]);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Daily LeetCode
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Vítor Belim&apos;s challenge log
            </h1>
            <p className="max-w-prose text-muted-foreground">
              One LeetCode daily challenge every day, with every attempt kept on
              record: the ones that passed, the ones that timed out, and the
              ones that never got started.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            nativeButton={false}
            render={
              <a
                href="https://github.com/vitor-belim/daily-leetcode"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Source on GitHub
            <ExternalLink data-icon="inline-end" />
          </Button>
        </header>

        <StatsOverview stats={stats} />

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Challenges
            </h2>
            <p className="text-sm text-muted-foreground">Newest first</p>
          </div>
          <DailyList
            initialDailies={dailies}
            initialHasMore={hasMore}
            initialCursor={nextCursor}
            currentMonth={formatMonthUTC(todayUTC())}
            total={total}
          />
        </section>
      </div>
    </div>
  );
}
