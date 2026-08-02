import { SplitPanels } from "@/components/blog/split-panels";
import { CodeBlock } from "@/components/code/code-block";
import { DifficultyBadge } from "@/components/difficulty-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdjacentDates, getProblem } from "@/lib/problems-repo";
import { getSolutions } from "@/lib/solutions-repo";
import { markdownToHtml } from "@/lib/markdown";
import { formatDate, formatLongDate, timeAgo } from "@/lib/date-display";
import { SolutionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  HardDrive,
  House,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string }>;
}) {
  const { year, month, day } = await params;
  const problem = await getProblem(year, month, day);
  const solutions = await getSolutions(year, month, day);

  if (!problem) notFound();

  const { prev, next } = await getAdjacentDates(`${year}-${month}-${day}`);

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
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              disabled={!prev}
              nativeButton={!prev}
              render={
                prev ? (
                  <Link href={`/blog/${prev.split("-").join("/")}`} />
                ) : undefined
              }
            >
              <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
            </Button>
            <p className="text-[11px] sm:text-sm text-muted-foreground text-center whitespace-nowrap min-w-[14ch] sm:min-w-[22ch]">
              {formatLongDate(problem.date)}
            </p>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              disabled={!next}
              nativeButton={!next}
              render={
                next ? (
                  <Link href={`/blog/${next.split("-").join("/")}`} />
                ) : undefined
              }
            >
              <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            </Button>
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
            <span className="hidden sm:inline">LeetCode</span>
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
                              s.status === SolutionStatus.MemoryLimitExceeded) &&
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
                          <span className="text-xs text-muted-foreground">
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
                                      ({formatDate(s.date)})
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
                                      s.status === SolutionStatus.FailedConstraints &&
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
                      No solutions yet
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Vítor is probably working on it right now!
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
