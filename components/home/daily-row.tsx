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
 * The language nearly every solution is written in. It goes without saying,
 * so only other languages are listed.
 */
const DEFAULT_LANGUAGE = "javascript";

/**
 * Formats an attempt count with the matching singular or plural noun.
 */
function pluralizeAttempts(count: number): string {
  return `${count} ${count === 1 ? "attempt" : "attempts"}`;
}

/**
 * Turns a summary into the one-line detail shown under the title, e.g.
 * "Solved after 3 attempts · beats 83% runtime". A solved day counts only
 * the challenge day's attempts up to its first pass, and shows no count when
 * the pass came on another day.
 */
function describeProgress(daily: DailySummary): string {
  const attempts = pluralizeAttempts(daily.attempts);
  const parts: string[] = [];

  switch (daily.solveStatus) {
    case SolveStatus.Solved:
      if (daily.attemptsToSolve === null) {
        parts.push("Solved");
      } else if (daily.attemptsToSolve === 1) {
        parts.push("Solved first try");
      } else {
        parts.push(`Solved after ${pluralizeAttempts(daily.attemptsToSolve)}`);
      }
      break;
    case SolveStatus.FunctionallyCorrect:
      parts.push("Functionally correct", `${attempts}, limits exceeded`);
      break;
    case SolveStatus.Failed:
      if (daily.attempts === 0) {
        parts.push("Not attempted");
        if (daily.hasEditorial) parts.push("editorial available");
      } else {
        parts.push(`${attempts}, none accepted`);
      }
      break;
    case SolveStatus.Pending:
      parts.push("Waiting for a submission");
      break;
  }

  const otherLanguages = daily.languages.filter(
    (language) => language !== DEFAULT_LANGUAGE,
  );
  if (otherLanguages.length > 0) parts.push(otherLanguages.join(", "));
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
