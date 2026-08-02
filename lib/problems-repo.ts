import fs from "node:fs/promises";
import type { Problem } from "./types";
import { problemFilePath, PROBLEMS_ROOT } from "./paths";
import { collectFilledDates } from "./archive";
import { isValidCalendarDate, shiftDateUTC } from "./dates";

/** One page of a descending pagination over ascending-sorted items. */
export interface DescendingPage<T> {
  page: T[];
  total: number;
  hasMore: boolean;
}

/** A page of archived problems plus the state needed to fetch the next. */
export interface LatestDailies {
  problems: Problem[];
  total: number;
  hasMore: boolean;
  /**
   * Cursor for the next page. Counts dates consumed, not problems returned:
   * an unreadable file is dropped from `problems` but still advances the
   * cursor, so clients must not derive the next offset from the list length.
   */
  nextOffset: number;
}

/** The archived days directly before and after a date, when they exist. */
export interface AdjacentDates {
  prev: string | null;
  next: string | null;
}

/**
 * Slices one newest-first page out of an ascending-sorted list.
 *
 * @param itemsAscending The full list, sorted ascending.
 * @param limit Maximum items per page.
 * @param offset Items to skip from the newest end.
 * @returns The page (newest first), the total count, and whether more items
 *   remain past this page.
 */
export function paginateDescending<T>(
  itemsAscending: T[],
  limit: number,
  offset: number,
): DescendingPage<T> {
  const total = itemsAscending.length;
  const page = [...itemsAscending].reverse().slice(offset, offset + limit);
  return { page, total, hasMore: offset + limit < total };
}

/**
 * Reads and parses one problem file, logging failures instead of throwing.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root directory.
 * @returns The parsed problem, or null when reading/parsing fails.
 */
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

/**
 * Loads the newest archived problems, paginated descending by date.
 *
 * @param limit Maximum problems per page.
 * @param offset Pagination cursor: dates already consumed from the newest
 *   end (a previous page's `nextOffset`).
 * @param root The problems root (defaults to `data/problems`).
 * @returns The page of problems (unreadable files are dropped), the total
 *   day count, whether more days remain, and the next cursor.
 */
export async function getLatestDailiesData(
  limit: number,
  offset: number,
  root: string = PROBLEMS_ROOT,
): Promise<LatestDailies> {
  const dates = collectFilledDates(root);
  const { page, total, hasMore } = paginateDescending(dates, limit, offset);
  const loaded = await Promise.all(page.map((date) => readProblemFile(date, root)));
  const problems = loaded.filter((p): p is Problem => p !== null);

  return { problems, total, hasMore, nextOffset: offset + page.length };
}

/**
 * Reads one day's archived problem, validating the date first so URL
 * segments can be passed straight in.
 *
 * @param year The four-digit year.
 * @param month The two-digit month.
 * @param day The two-digit day.
 * @param root The problems root (defaults to `data/problems`).
 * @returns The problem, or null when the date is invalid, the file is
 *   missing, or it fails to parse.
 */
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

/**
 * Checks whether a problem file exists for a date.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root directory.
 * @returns True when the file exists on disk.
 */
async function problemExists(date: string, root: string): Promise<boolean> {
  try {
    await fs.access(problemFilePath(date, root));
    return true;
  } catch {
    return false;
  }
}

/**
 * Looks up whether the days immediately before and after a date are
 * archived, for prev/next navigation.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The problems root (defaults to `data/problems`).
 * @returns Each neighbor's `YYYY-MM-DD` when its problem file exists, null
 *   otherwise.
 */
export async function getAdjacentDates(
  date: string,
  root: string = PROBLEMS_ROOT,
): Promise<AdjacentDates> {
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
