import { DifficultyBadge } from "@/components/difficulty-badge";
import {
  SOLVE_STATUS_STYLES,
  SolveStatusIcon,
} from "@/components/solve-status";
import { formatWeekdayShort } from "@/lib/date-display";
import { SolveStatus, type DailySummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface DailyRowProps {
  daily: DailySummary;
}

/**
 * Turns a summary into the one-line detail shown under the title, e.g.
 * "Solved in 3 attempts · javascript · beats 83% runtime".
 */
function describeProgress(daily: DailySummary): string {
  const attempts = `${daily.attempts} ${daily.attempts === 1 ? "attempt" : "attempts"}`;
  const parts: string[] = [];

  switch (daily.solveStatus) {
    case SolveStatus.Solved:
      parts.push(
        daily.attempts === 1 ? "Solved first try" : `Solved in ${attempts}`,
      );
      break;
    case SolveStatus.Failed:
      parts.push(`${attempts}, none accepted`);
      break;
    case SolveStatus.Unsolved:
      parts.push("Not attempted");
      if (daily.hasEditorial) parts.push("editorial available");
      break;
    case SolveStatus.Pending:
      parts.push("Waiting for a submission");
      break;
  }

  if (daily.languages.length > 0) parts.push(daily.languages.join(", "));
  if (daily.bestRuntime !== null) {
    parts.push(`beats ${Math.round(daily.bestRuntime)}% runtime`);
  }

  return parts.join(" · ");
}

export function DailyRow({ daily }: DailyRowProps) {
  const [year, month, day] = daily.date.split("-");

  return (
    <Link
      href={`/blog/${year}/${month}/${day}`}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none sm:gap-4",
        SOLVE_STATUS_STYLES[daily.solveStatus].rowClassName,
      )}
    >
      <div className="flex w-10 shrink-0 flex-col items-center leading-none">
        <span className="font-heading text-xl font-semibold tabular-nums">
          {day}
        </span>
        <span className="mt-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
          {formatWeekdayShort(daily.date)}
        </span>
      </div>

      <SolveStatusIcon status={daily.solveStatus} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-snug group-hover:text-primary">
          {daily.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {describeProgress(daily)}
        </p>
      </div>

      <DifficultyBadge difficulty={daily.difficulty} />

      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground sm:block" />
    </Link>
  );
}
