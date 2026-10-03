import {
  AdjacentDayLink,
  AdjacentDirection,
} from "@/components/blog/adjacent-day-link";
import { SplitPanels } from "@/components/blog/split-panels";
import { CodeBlock } from "@/components/code/code-block";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { LocalDateTime } from "@/components/local-date-time";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ArchivedDayParams, listArchivedDayParams } from "@/lib/archive";
import { formatLongDate, timeAgo } from "@/lib/date-display";
import { isPastDateUTC } from "@/lib/dates";
import { describeProblem } from "@/lib/excerpt";
import { markdownToHtml } from "@/lib/markdown";
import { getAdjacentDates, getProblem } from "@/lib/problems-repo";
import { blogPath } from "@/lib/routes";
import { SITE_LOCALE, SITE_NAME } from "@/lib/site";
import { getSolutions } from "@/lib/solutions-repo";
import { summarizeSolutions } from "@/lib/solve-status";
import { SolutionStatus, SolveStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Cpu, ExternalLink, HardDrive, House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export const revalidate = 3600;

/**
 * Prerenders one page per archived day at build time. The archive only
 * changes through a commit, and every commit redeploys, so the build always
 * sees every day there is; any other date 404s instead of rendering on demand.
 * Each page is still regenerated in the background at most hourly
 * (`revalidate`), because parts of it depend on the clock rather than the
 * archive: the relative submission times, today's "waiting for a submission"
 * copy and the pending-versus-failed summary would otherwise stay frozen at
 * the last deploy.
 *
 * @returns The `year`/`month`/`day` segments of every archived day.
 */
export function generateStaticParams(): ArchivedDayParams[] {
  return listArchivedDayParams();
}

/**
 * Gives each day's page its own title, description, canonical URL and Open
 * Graph article tags. The Open Graph image comes from the colocated
 * `opengraph-image` file, so it is not set here.
 *
 * @param props The page props, holding the route segments.
 * @returns The day's metadata.
 */
export async function generateMetadata({
  params,
}: PageProps<"/blog/[year]/[month]/[day]">): Promise<Metadata> {
  const { year, month, day } = await params;
  const problem = await getProblem(year, month, day);

  if (!problem) notFound();

  const path = blogPath(`${year}-${month}-${day}`);
  const description = describeProblem(problem);

  return {
    title: problem.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: problem.title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      publishedTime: problem.date,
    },
  };
}

/**
 * Renders one archived day: the problem statement beside its submitted
 * solutions, with navigation to the neighboring days.
 *
 * @param props The page props, holding the route segments.
 * @returns The day's page.
 */
export default async function ProblemPage({
  params,
}: PageProps<"/blog/[year]/[month]/[day]">) {
  const { year, month, day } = await params;
  const date = `${year}-${month}-${day}`;
  const [problem, archivedSolutions, { prev, next }] = await Promise.all([
    getProblem(year, month, day),
    getSolutions(year, month, day),
    getAdjacentDates(date),
  ]);

  if (!problem) notFound();

  const solutions = archivedSolutions ?? [];
  const awaitingSubmission =
    summarizeSolutions(archivedSolutions, date).solveStatus ===
    SolveStatus.Pending;
  const emptyStateTitle = awaitingSubmission
    ? "Waiting for a submission"
    : "Not attempted";
  const emptyStateDetail = !awaitingSubmission
    ? "No submission was made for this challenge."
    : isPastDateUTC(date)
      ? "Submissions for this challenge haven't been archived yet."
      : "Vítor is probably working on it right now!";

  const authorMap = new Map<string, number>();

  for (const s of solutions) {
    const authorKey = `${s.author}@${s.date.slice(0, 10)}`;
    authorMap.set(authorKey, (authorMap.get(authorKey) || 0) + 1);
  }

  for (const [author, total] of authorMap) {
    if (total === 1) {
      authorMap.delete(author);
    }
  }

  const solutionsWithLabels = solutions.map((s) => {
    const authorKey = `${s.author}@${s.date.slice(0, 10)}`;

    const total = authorMap.get(authorKey) || 0;
    let label = "";

    if (total > 0) {
      authorMap.set(authorKey, total - 1);
      label = `#${total}`;
    }

    return {
      ...s,
      label,
    };
  });

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b px-3 py-3 sm:px-6 sm:py-4 grid grid-cols-3 items-center gap-2 shrink-0">
        <div className="flex items-center">
          <Link
            href="/"
            aria-label="All challenges"
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <House className="w-5 h-5" />
          </Link>
        </div>

        <div className="flex flex-col items-center min-w-0">
          <h1 className="text-sm sm:text-xl font-bold leading-tight sm:leading-none text-center line-clamp-2 sm:line-clamp-1">
            {problem.title}
          </h1>
          <div className="flex items-center gap-1 mt-1">
            <AdjacentDayLink
              direction={AdjacentDirection.Previous}
              date={prev}
            />
            <p className="text-[11px] sm:text-sm text-muted-foreground text-center whitespace-nowrap min-w-[14ch] sm:min-w-[22ch]">
              {formatLongDate(problem.date)}
            </p>
            <AdjacentDayLink direction={AdjacentDirection.Next} date={next} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <DifficultyBadge difficulty={problem.difficulty} />
          <a
            href={problem.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="sr-only sm:not-sr-only">LeetCode</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <SplitPanels
          left={{
            title: "Description",
            className: "border-b lg:border-b-0 lg:border-r",
            content: (
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-6">
                  <div
                    className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-pre:bg-muted prose-pre:text-foreground"
                    dangerouslySetInnerHTML={{ __html: problem.description }}
                  />
                </div>
              </ScrollArea>
            ),
          }}
          right={{
            title: "Solutions",
            content:
              solutions.length > 0 ? (
                <Tabs
                  defaultValue={`${solutionsWithLabels[0]?.author ?? ""}-0`}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="px-4 py-2 border-b bg-muted/10 shrink-0 overflow-x-auto">
                    <TabsList className="group-data-horizontal/tabs:h-auto justify-start bg-transparent p-0 gap-2">
                      {solutionsWithLabels.map((s, index) => (
                        <TabsTrigger
                          key={`${s.author}-${index}`}
                          value={`${s.author}-${index}`}
                          className={cn(
                            "shadow-sm border rounded-md px-4 transition-all flex flex-col gap-0 h-auto",
                            s.status === SolutionStatus.Done &&
                              "bg-green-100 text-green-800 data-active:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:data-active:bg-green-900/50",
                            (s.status === SolutionStatus.TimeLimitExceeded ||
                              s.status ===
                                SolutionStatus.MemoryLimitExceeded) &&
                              "bg-yellow-100 text-yellow-800 data-active:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:data-active:bg-yellow-900/50",
                            s.status === SolutionStatus.Failed &&
                              "bg-red-100 text-red-800 data-active:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:data-active:bg-red-900/50",
                            s.status === SolutionStatus.FailedConstraints &&
                              "bg-orange-100 text-orange-800 data-active:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:data-active:bg-orange-900/50",
                            "data-active:ring-1 data-active:ring-primary/20 data-active:border-primary/30",
                          )}
                        >
                          <span>
                            {s.author} {s.label}
                          </span>
                          <span className="text-[0.6875rem] text-muted-foreground">
                            {timeAgo(s.date)}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {solutionsWithLabels.map((s, index) => (
                      <TabsContent
                        key={`${s.author}-${index}`}
                        value={`${s.author}-${index}`}
                        className="h-full m-0 p-0 overflow-hidden outline-none"
                      >
                        <ScrollArea className="h-full">
                          <div className="p-6 space-y-6">
                            {(s.notes || s.aiExplanation) && (
                              <Accordion
                                className="border rounded-lg px-4"
                                defaultValue={
                                  s.notes
                                    ? ["notes"]
                                    : s.aiExplanation
                                      ? ["ai-explanation"]
                                      : []
                                }
                              >
                                {s.notes && (
                                  <AccordionItem
                                    value="notes"
                                    className="border-b-0"
                                  >
                                    <AccordionTrigger className="hover:no-underline py-4">
                                      <span className="text-sm font-semibold">
                                        Developer Notes
                                      </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                      <div
                                        className="text-sm text-muted-foreground leading-relaxed prose dark:prose-invert max-w-none prose-sm"
                                        dangerouslySetInnerHTML={{
                                          __html: markdownToHtml(s.notes),
                                        }}
                                      />
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {s.aiExplanation && (
                                  <AccordionItem
                                    value="ai-explanation"
                                    className="border-b-0"
                                  >
                                    <AccordionTrigger className="hover:no-underline py-4">
                                      <span className="text-sm font-semibold">
                                        AI Explanation
                                      </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                      <div
                                        className="text-sm text-muted-foreground leading-relaxed prose dark:prose-invert max-w-none prose-sm"
                                        dangerouslySetInnerHTML={{
                                          __html: markdownToHtml(
                                            s.aiExplanation,
                                          ),
                                        }}
                                      />
                                    </AccordionContent>
                                  </AccordionItem>
                                )}
                              </Accordion>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Language:{" "}
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
                                    {s.language}
                                  </Badge>
                                  {s.date && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (<LocalDateTime value={s.date} />)
                                    </span>
                                  )}
                                </span>
                                {s.status && (
                                  <Badge
                                    className={cn(
                                      "font-bold",
                                      s.status === SolutionStatus.Done &&
                                        "bg-green-500 hover:bg-green-600",
                                      (s.status ===
                                        SolutionStatus.TimeLimitExceeded ||
                                        s.status ===
                                          SolutionStatus.MemoryLimitExceeded) &&
                                        "bg-yellow-500 hover:bg-yellow-600 text-black",
                                      s.status === SolutionStatus.Failed &&
                                        "bg-red-500 hover:bg-red-600",
                                      s.status ===
                                        SolutionStatus.FailedConstraints &&
                                        "bg-orange-500 hover:bg-orange-600",
                                    )}
                                  >
                                    {s.status.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 py-2">
                                {s.cpuUsage !== undefined && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Cpu className="w-3 h-3" /> CPU
                                        Performance
                                      </span>
                                      <span className="font-medium">
                                        {s.cpuUsage?.toFixed(2)}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={s.cpuUsage}
                                      aria-label="CPU performance percentile"
                                      className="h-1.5"
                                    />
                                  </div>
                                )}
                                {s.memoryUsage !== undefined && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <HardDrive className="w-3 h-3" /> Memory
                                        Performance
                                      </span>
                                      <span className="font-medium">
                                        {s.memoryUsage?.toFixed(2)}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={s.memoryUsage}
                                      aria-label="Memory performance percentile"
                                      className="h-1.5"
                                    />
                                  </div>
                                )}
                              </div>

                              <CodeBlock code={s.code} language={s.language} />
                            </div>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                  <div className="max-w-xs space-y-2">
                    <p className="font-semibold text-muted-foreground">
                      {emptyStateTitle}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {emptyStateDetail}
                    </p>
                  </div>
                </div>
              ),
          }}
        />
      </main>
    </div>
  );
}
