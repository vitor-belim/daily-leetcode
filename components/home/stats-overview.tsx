import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Difficulty, type ArchiveStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CircleCheck, Flame } from "lucide-react";

interface StatsOverviewProps {
  stats: ArchiveStats;
}

/** Color classes for one difficulty's progress bar and label. */
interface DifficultyTone {
  label: string;
  indicatorClassName: string;
  textClassName: string;
}

const DIFFICULTY_TONES: Record<Difficulty, DifficultyTone> = {
  [Difficulty.Easy]: {
    label: "Easy",
    indicatorClassName: "[&>[data-slot=progress-indicator]]:bg-emerald-500",
    textClassName: "text-emerald-700 dark:text-emerald-400",
  },
  [Difficulty.Medium]: {
    label: "Medium",
    indicatorClassName: "[&>[data-slot=progress-indicator]]:bg-amber-500",
    textClassName: "text-amber-700 dark:text-amber-400",
  },
  [Difficulty.Hard]: {
    label: "Hard",
    indicatorClassName: "[&>[data-slot=progress-indicator]]:bg-rose-500",
    textClassName: "text-rose-700 dark:text-rose-400",
  },
};

const DIFFICULTY_ORDER = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard];

/**
 * Computes a whole-number percentage, treating an empty denominator as 0%.
 */
function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** Pluralizes "day" for a streak length. */
function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const finished = stats.totalDays - stats.pending;
  const solvedPercent = percent(stats.solved, finished);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            Solved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
            {stats.solved}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {finished}
            </span>
          </p>
          <Progress value={solvedPercent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {solvedPercent}% of finished days, {stats.failed} failed,{" "}
            {stats.unsolved} skipped
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Flame className="size-4 text-orange-500" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
            {stats.currentStreak}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              {stats.currentStreak === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Consecutive days solved. Best run so far:{" "}
            {days(stats.longestStreak)}.
          </p>
        </CardContent>
      </Card>

      <Card size="sm" className="sm:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            By difficulty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DIFFICULTY_ORDER.map((difficulty) => {
            const tone = DIFFICULTY_TONES[difficulty];
            const { total, solved } = stats.byDifficulty[difficulty];
            return (
              <div key={difficulty} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-medium", tone.textClassName)}>
                    {tone.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {solved} / {total}
                  </span>
                </div>
                <Progress
                  value={percent(solved, total)}
                  className={cn("h-1.5", tone.indicatorClassName)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
