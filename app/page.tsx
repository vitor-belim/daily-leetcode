import { DailyList } from "@/components/daily-list";
import { getLatestDailies } from "@/lib/data";

export default async function HomePage() {
  const { problems, hasMore } = await getLatestDailies(10);

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
        <DailyList initialProblems={problems} initialHasMore={hasMore} />
      </div>
    </div>
  );
}
