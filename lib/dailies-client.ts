import { monthOf } from "./dates";
import {
  readArray,
  readBoolean,
  readCount,
  readDay,
  readFields,
  readMember,
  readNullableCount,
  readNullableNumber,
  readString,
  readStringArray,
} from "./json-fields";
import { dailiesPath } from "./routes";
import {
  Difficulty,
  SolveStatus,
  type DailySummary,
  type LatestDailies,
} from "./types";

const MONTH_CURSOR = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Requests one URL path and resolves to its response, matching the shape of
 * the global `fetch` so tests can stand in for the network.
 */
export type DailiesFetcher = (path: string) => Promise<Response>;

/**
 * The server-rendered page a home list was seeded from. Two seeds that agree
 * describe the same `/` payload, so state grown on top of one can be reused
 * on top of the other.
 */
export interface DailyListSeed {
  /** The first page's `nextCursor`. */
  cursor: string | null;
  /** The first page's `hasMore`. */
  hasMore: boolean;
  /** The archive-wide day count the first page reported. */
  total: number;
}

/** What the home list adds on top of the server-rendered months. */
export interface DailyListState {
  /** Days loaded through "Load previous month", newest first. */
  olderDailies: DailySummary[];
  /** Whether anything older than `olderDailies` remains. */
  hasMore: boolean;
  /** The cursor for the next older page; null once nothing older remains. */
  cursor: string | null;
  /** The `YYYY-MM` months currently expanded. */
  openMonths: string[];
}

/** A home list's state, tagged with the seed it was grown from. */
export interface DailyListSnapshot {
  seed: DailyListSeed;
  state: DailyListState;
}

/**
 * Checks whether a string is a `YYYY-MM` month cursor, the only shape the
 * month-page route handler serves.
 *
 * @param value The candidate cursor.
 * @returns True for a four-digit year and a `01`-`12` month.
 */
export function isMonthCursor(value: string): boolean {
  return MONTH_CURSOR.test(value);
}

/**
 * Reads a field holding a `YYYY-MM` month cursor or null.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The cursor, or null.
 * @throws {TypeError} When the field is missing or neither null nor a
 *   `YYYY-MM` month.
 */
function readNullableCursor(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string | null {
  if (fields.get(key) === null) return null;
  const value = readString(fields, key, path);
  if (!isMonthCursor(value)) {
    throw new TypeError(`${path}.${key} is not a YYYY-MM month`);
  }
  return value;
}

/**
 * Validates one untrusted day summary, keeping only the fields the home list
 * renders.
 *
 * @param value The parsed JSON value.
 * @param path Where the value sits in the payload, for error messages.
 * @returns A freshly built summary.
 * @throws {TypeError} When any field is missing or malformed.
 */
function parseDailySummary(value: unknown, path: string): DailySummary {
  const fields = readFields(value, path);

  return {
    date: readDay(fields, "date", path),
    title: readString(fields, "title", path),
    difficulty: readMember(
      Object.values(Difficulty),
      fields,
      "difficulty",
      path,
    ),
    solveStatus: readMember(
      Object.values(SolveStatus),
      fields,
      "solveStatus",
      path,
    ),
    attempts: readCount(fields, "attempts", path),
    attemptsToSolve: readNullableCount(fields, "attemptsToSolve", path),
    languages: readStringArray(fields, "languages", path),
    bestRuntime: readNullableNumber(fields, "bestRuntime", path),
    hasEditorial: readBoolean(fields, "hasEditorial", path),
  };
}

/**
 * Validates the JSON body of a month page from `/api/dailies/[before]`.
 * `Response.json()` is untyped, so the browser checks the shape, enum values
 * and pagination invariants itself rather than trusting a stale or broken
 * response.
 *
 * @param value The parsed JSON body.
 * @returns A freshly built page holding only the known fields.
 * @throws {TypeError} When the body doesn't describe a page, an enum field
 *   holds an undeclared value, or `hasMore` and `nextCursor` disagree.
 */
export function parseLatestDailies(value: unknown): LatestDailies {
  const path = "page";
  const fields = readFields(value, path);

  const dailies = readArray(fields.get("dailies"), `${path}.dailies`);

  const hasMore = readBoolean(fields, "hasMore", path);
  const nextCursor = readNullableCursor(fields, "nextCursor", path);
  if (hasMore !== (nextCursor !== null)) {
    throw new TypeError(`${path}.hasMore and ${path}.nextCursor disagree`);
  }

  return {
    dailies: dailies.map((daily, index) =>
      parseDailySummary(daily, `${path}.dailies[${index}]`),
    ),
    total: readCount(fields, "total", path),
    hasMore,
    nextCursor,
  };
}

/**
 * Requests a path with the browser's `fetch`.
 *
 * @param path The URL path to request.
 * @returns The response.
 */
function fetchPath(path: string): Promise<Response> {
  return fetch(path);
}

/**
 * Loads the archived month just before a cursor from the statically
 * generated month-page route handler.
 *
 * @param before The `YYYY-MM` cursor from a previous page's `nextCursor`.
 * @param fetcher How to request the page (defaults to the global `fetch`).
 * @returns The validated page.
 * @throws {Error} When the request fails or answers with a non-2xx status.
 * @throws {TypeError} When the body is not a valid page.
 */
export async function fetchDailiesPage(
  before: string,
  fetcher: DailiesFetcher = fetchPath,
): Promise<LatestDailies> {
  const path = dailiesPath(before);
  const response = await fetcher(path);
  if (!response.ok) {
    throw new Error(`GET ${path} answered HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  return parseLatestDailies(body);
}

/**
 * Builds the state of a freshly mounted home list: nothing loaded beyond the
 * server-rendered months, and only the current month expanded.
 *
 * @param seed The server-rendered first page's pagination state.
 * @param currentMonth Today's `YYYY-MM` month.
 * @returns The initial state.
 */
export function initialDailyListState(
  seed: DailyListSeed,
  currentMonth: string,
): DailyListState {
  return {
    olderDailies: [],
    hasMore: seed.hasMore,
    cursor: seed.cursor,
    openMonths: [currentMonth],
  };
}

/**
 * Picks the state a remounting home list starts from. A snapshot survives
 * client-side navigation away and back, but is reused only when it was grown
 * from the same first page as the current one; otherwise its older pages
 * could overlap or leave gaps, so the list starts over.
 *
 * @param snapshot The last saved snapshot, or null when none exists.
 * @param seed The current first page's pagination state.
 * @param currentMonth Today's `YYYY-MM` month.
 * @returns The snapshot's state when its seed matches, else a fresh state.
 */
export function restoreDailyListState(
  snapshot: DailyListSnapshot | null,
  seed: DailyListSeed,
  currentMonth: string,
): DailyListState {
  if (
    snapshot !== null &&
    snapshot.seed.cursor === seed.cursor &&
    snapshot.seed.hasMore === seed.hasMore &&
    snapshot.seed.total === seed.total
  ) {
    return snapshot.state;
  }
  return initialDailyListState(seed, currentMonth);
}

/**
 * Adds a loaded older page to a home list's state, expanding the months it
 * brought in and advancing the cursor.
 *
 * @param state The current state.
 * @param page The page loaded with `state.cursor`.
 * @returns The new state; `state` itself is left untouched.
 */
export function appendDailiesPage(
  state: DailyListState,
  page: LatestDailies,
): DailyListState {
  return {
    olderDailies: [...state.olderDailies, ...page.dailies],
    hasMore: page.hasMore,
    cursor: page.nextCursor,
    openMonths: [
      ...new Set([
        ...state.openMonths,
        ...page.dailies.map((daily) => monthOf(daily.date)),
      ]),
    ],
  };
}
