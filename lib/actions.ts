"use server";

import type { Problem } from "./types";
import { getLatestDailiesData } from "./problems-repo";

export async function getLatestDailies(
  limit = 10,
  offset = 0,
): Promise<{ problems: Problem[]; total: number; hasMore: boolean }> {
  return getLatestDailiesData(limit, offset);
}
