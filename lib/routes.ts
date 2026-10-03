/**
 * Builds the blog URL path of an archived day. Isomorphic, so client
 * components, server components and metadata routes all link the same way.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @returns The `/blog/YYYY/MM/DD` path.
 */
export function blogPath(date: string): string {
  return `/blog/${date.split("-").join("/")}`;
}

/**
 * Builds the URL path of the statically generated JSON page holding the
 * archived month just before a cursor, as served by the
 * `app/api/dailies/[before]` route handler.
 *
 * @param before The `YYYY-MM` cursor from a previous page's `nextCursor`.
 * @returns The `/api/dailies/YYYY-MM` path.
 */
export function dailiesPath(before: string): string {
  return `/api/dailies/${before}`;
}
