import fs from "node:fs/promises";
import type { Problem } from "./types";
import { problemFilePath, PROBLEMS_ROOT } from "./paths";
import { collectFilledDates } from "./archive";
import { isValidCalendarDate, shiftDateUTC } from "./dates";

export function paginateDescending<T>(
  itemsAscending: T[],
  limit: number,
  offset: number,
): { page: T[]; total: number; hasMore: boolean } {
  const total = itemsAscending.length;
  const page = [...itemsAscending].reverse().slice(offset, offset + limit);
  return { page, total, hasMore: offset + limit < total };
}

async function readProblemFile(
  date: string,
  root: string,
): Promise<Problem | null> {
  try {
    const content = await fs.readFile(problemFilePath(date, root), "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading problem for ${date}:`, error);
    return null;
  }
}

export async function getLatestDailiesData(
  limit: number,
  offset: number,
  root: string = PROBLEMS_ROOT,
): Promise<{ problems: Problem[]; total: number; hasMore: boolean }> {
  const dates = collectFilledDates(root);
  const { page, total, hasMore } = paginateDescending(dates, limit, offset);
  const loaded = await Promise.all(page.map((date) => readProblemFile(date, root)));
  const problems = loaded.filter((p): p is Problem => p !== null);

  return { problems, total, hasMore };
}

export async function getProblem(
  year: string,
  month: string,
  day: string,
  root: string = PROBLEMS_ROOT,
): Promise<Problem | null> {
  const date = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    return null;
  }

  try {
    const content = await fs.readFile(problemFilePath(date, root), "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function problemExists(date: string, root: string): Promise<boolean> {
  try {
    await fs.access(problemFilePath(date, root));
    return true;
  } catch {
    return false;
  }
}

export async function getAdjacentDates(
  date: string,
  root: string = PROBLEMS_ROOT,
): Promise<{ prev: string | null; next: string | null }> {
  const prevDate = shiftDateUTC(date, -1);
  const nextDate = shiftDateUTC(date, 1);

  const [prevExists, nextExists] = await Promise.all([
    problemExists(prevDate, root),
    problemExists(nextDate, root),
  ]);

  return {
    prev: prevExists ? prevDate : null,
    next: nextExists ? nextDate : null,
  };
}
