"use client";

import { DifficultyBadge } from "@/components/difficulty-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLatestDailies } from "@/lib/actions";
import { Problem } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface DailyListProps {
  initialProblems: Problem[];
  initialHasMore: boolean;
  initialNextOffset: number;
}

export function DailyList({
  initialProblems,
  initialHasMore,
  initialNextOffset,
}: DailyListProps) {
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoading, setIsLoading] = useState(false);

  async function loadMore() {
    setIsLoading(true);
    try {
      const result = await getLatestDailies(10, nextOffset);
      setProblems((prev) => [...prev, ...result.problems]);
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
    } catch (error) {
      console.error("Failed to load more dailies:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (problems.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground italic">
          No daily assignments found yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {problems.map((problem) => {
          const [year, month, day] = problem.date.split("-");
          return (
            <Link
              href={`/blog/${year}/${month}/${day}`}
              key={problem.date}
              className="block group"
            >
              <Card className="transition-all group-hover:border-primary/50 group-hover:shadow-sm">
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {problem.title}
                      </CardTitle>
                      <CardDescription>{problem.date}</CardDescription>
                    </div>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
