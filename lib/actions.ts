"use server";

import { getDailySummariesByMonth, type LatestDailies } from "./dailies-repo";

const MAX_MONTHS = 12;
const MONTH_CURSOR = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Server action returning archived days as summaries, a run of whole
 * calendar months at a time. As a publicly invokable endpoint it clamps its
 * inputs rather than trusting them: `months` to 1-12 (NaN to 1), and a
 * malformed `before` cursor to null, which restarts from today's month.
 *
 * @param months How many calendar months to cover (default 1).
 * @param before The previous page's `nextCursor`, or null for the first page.
 * @returns The page of summaries plus pagination state.
 */
export async function getLatestDailies(
  months = 1,
  before: string | null = null,
): Promise<LatestDailies> {
  const safeMonths = Math.min(Math.max(Math.trunc(months) || 1, 1), MAX_MONTHS);
  const safeBefore =
    before !== null && MONTH_CURSOR.test(before) ? before : null;

  return getDailySummariesByMonth(safeMonths, safeBefore);
}
