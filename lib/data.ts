import fs from "node:fs/promises";
import path from "node:path";

export interface Problem {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  link: string;
  date: string; // YYYY-MM-DD
}

export interface Solution {
  author: string;
  code: string;
  language: string;
  explanation: string;
  explanationSource?: "AI" | "manual";
  status?: "DONE" | "TLE" | "MLE" | "FAILED";
  cpuUsage?: number; // 0-100
  memoryUsage?: number; // 0-100
  date?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

export async function getLatestDailies(limit = 10): Promise<Problem[]> {
  const problemsDir = path.join(DATA_DIR, "problems");
  const problems: Problem[] = [];

  try {
    const years = await fs.readdir(problemsDir);
    for (const year of years) {
      if (year === ".DS_Store") continue;
      const monthsDir = path.join(problemsDir, year);
      const months = await fs.readdir(monthsDir);
      for (const month of months) {
        if (month === ".DS_Store") continue;
        const daysDir = path.join(monthsDir, month);
        const days = await fs.readdir(daysDir);
        for (const dayFile of days) {
          if (dayFile === ".DS_Store" || !dayFile.endsWith(".json")) continue;
          const filePath = path.join(daysDir, dayFile);
          const content = await fs.readFile(filePath, "utf8");
          problems.push(JSON.parse(content));
        }
      }
    }
  } catch (error) {
    console.error("Error reading problems:", error);
  }

  return problems
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getProblem(
  year: string,
  month: string,
  day: string,
): Promise<Problem | null> {
  try {
    const filePath = path.join(
      DATA_DIR,
      "problems",
      year,
      month,
      `${day}.json`,
    );
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getSolutions(
  year: string,
  month: string,
  day: string,
): Promise<Solution[]> {
  try {
    const filePath = path.join(
      DATA_DIR,
      "solutions",
      year,
      month,
      `${day}.json`,
    );
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}
