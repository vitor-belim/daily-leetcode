"use server";

import { getLatestDailiesData, type LatestDailies } from "./problems-repo";

const MAX_LIMIT = 50;

/**
 * Server action returning the newest archived problems, paginated. As a
 * publicly invokable endpoint it clamps its inputs rather than trusting
 * them: `limit` to 1-50, `offset` to >= 0, NaN to the defaults.
 *
 * @param limit Maximum problems per page (default 10).
 * @param offset Pagination cursor; pass the previous page's `nextOffset`.
 * @returns The page of problems plus pagination state.
 */
export async function getLatestDailies(
  limit = 10,
  offset = 0,
): Promise<LatestDailies> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_LIMIT);
  const safeOffset = Math.max(Math.trunc(offset) || 0, 0);

  return getLatestDailiesData(safeLimit, safeOffset);
}
