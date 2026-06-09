import { CodeBlock } from "@/components/code/code-block";
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
import { getProblem, getSolutions, timeAgo } from "@/lib/data";
import { markdownToHtml } from "@/lib/markdown";
import { cn, formatDate } from "@/lib/utils";
import { ChevronLeft, Cpu, ExternalLink, HardDrive } from "lucide-react";
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
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-none">{problem.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{problem.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              problem.difficulty === "Easy"
                ? "secondary"
                : problem.difficulty === "Medium"
                  ? "default"
                  : "destructive"
            }
            className={
              problem.difficulty === "Easy"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : problem.difficulty === "Medium"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  : ""
            }
          >
            {problem.difficulty}
          </Badge>
          <a
            href={problem.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            LeetCode <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Description */}
        <section className="w-1/2 min-h-0 flex flex-col border-r overflow-hidden">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="p-6">
              <div
                className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-pre:bg-muted prose-pre:text-foreground"
                dangerouslySetInnerHTML={{ __html: problem.description }}
              />
            </div>
          </ScrollArea>
        </section>

        {/* Right Column: Solutions */}
        <section className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Solutions
            </h2>
          </div>

          {solutions.length > 0 ? (
            <Tabs
              defaultValue={`${solutionsWithLabels[0].author}-0`}
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
                        s.status === "DONE" &&
                          "bg-green-100 text-green-800 data-active:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:data-active:bg-green-900/50",
                        (s.status === "TLE" || s.status === "MLE") &&
                          "bg-yellow-100 text-yellow-800 data-active:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:data-active:bg-yellow-900/50",
                        s.status === "FAILED" &&
                          "bg-red-100 text-red-800 data-active:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:data-active:bg-red-900/50",
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
                                    Notes
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
                                      __html: markdownToHtml(s.aiExplanation),
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
                              <Badge variant="outline" className="capitalize">
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
                                  s.status === "DONE" &&
                                    "bg-green-500 hover:bg-green-600",
                                  (s.status === "TLE" || s.status === "MLE") &&
                                    "bg-yellow-500 hover:bg-yellow-600 text-black",
                                  s.status === "FAILED" &&
                                    "bg-red-500 hover:bg-red-600",
                                )}
                              >
                                {s.status}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-2">
                            {s.cpuUsage !== undefined && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Cpu className="w-3 h-3" /> CPU Performance
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
                  Be the first to contribute a solution for this daily
                  challenge!
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
