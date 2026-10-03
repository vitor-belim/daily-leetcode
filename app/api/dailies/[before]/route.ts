import { listMonthCursors } from "@/lib/archive";
import { getDailySummariesByMonth } from "@/lib/dailies-repo";
import { isMonthCursor } from "@/lib/dailies-client";

export const dynamic = "force-static";
export const dynamicParams = false;

/** The `[before]` segment of one month page's URL. */
interface DailiesRouteParams {
  before: string;
}

/**
 * Prerenders a month page for every cursor the home list can ask for, so
 * "Load previous month" is served from the CDN. Any other cursor 404s
 * instead of rendering on demand, like an unknown blog day, so no request
 * reads `data/` at runtime and arbitrary months can't fill the cache.
 *
 * @returns One `before` per month from the oldest archived one through
 *   today's.
 */
export function generateStaticParams(): DailiesRouteParams[] {
  return listMonthCursors().map((before) => ({ before }));
}

/**
 * Serves the archived month just before a cursor as JSON, for the home
 * list's "Load previous month" button.
 *
 * @param _request The incoming request, unused: the page depends only on
 *   the cursor.
 * @param context The route context holding the `before` cursor.
 * @returns The `LatestDailies` page, or a 404 when `before` is not a
 *   `YYYY-MM` month.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/dailies/[before]">,
): Promise<Response> {
  const { before } = await context.params;
  if (!isMonthCursor(before)) {
    return new Response(null, { status: 404 });
  }

  return Response.json(await getDailySummariesByMonth(1, before));
}
