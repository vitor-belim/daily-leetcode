import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLatestDailies } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function HomePage() {
  const latestDailies = await getLatestDailies(10);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          LeetCode Daily Challenges
        </h1>
        <h2 className="text-2xl font-bold tracking-tight text-muted-foreground">
          by Vítor Belim
        </h2>
        <p className="text-muted-foreground mt-2">
          Tracking daily challenges and solutions.
        </p>
      </header>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Latest Daily Assignments</h2>
        {latestDailies.length > 0 ? (
          <div className="grid gap-4">
            {latestDailies.map((problem) => {
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
                          <CardDescription>
                            {formatDate(problem.date)}
                          </CardDescription>
                        </div>
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
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground italic">
              No daily assignments found yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
