import { describe, it, expect } from "vitest";
import {
  appendDailiesPage,
  fetchDailiesPage,
  initialDailyListState,
  isMonthCursor,
  parseLatestDailies,
  restoreDailyListState,
  type DailyListSeed,
  type DailyListSnapshot,
  type DailyListState,
} from "./dailies-client";
import {
  Difficulty,
  SolveStatus,
  type DailySummary,
  type LatestDailies,
} from "./types";

function summary(
  date: string,
  overrides: Partial<DailySummary> = {},
): DailySummary {
  return {
    date,
    title: `Problem ${date}`,
    difficulty: Difficulty.Medium,
    solveStatus: SolveStatus.Solved,
    attempts: 2,
    attemptsToSolve: 2,
    languages: ["javascript"],
    bestRuntime: 87.5,
    hasEditorial: false,
    ...overrides,
  };
}

function page(overrides: Partial<LatestDailies> = {}): LatestDailies {
  return {
    dailies: [summary("2026-03-31"), summary("2026-03-30")],
    total: 120,
    hasMore: true,
    nextCursor: "2026-03",
    ...overrides,
  };
}

/** Serializes through JSON the way the route handler's response does. */
function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("isMonthCursor", () => {
  it("accepts zero-padded YYYY-MM months", () => {
    expect(isMonthCursor("2026-01")).toBe(true);
    expect(isMonthCursor("2026-12")).toBe(true);
  });

  it("rejects month numbers outside 01-12 and other shapes", () => {
    expect(isMonthCursor("2026-00")).toBe(false);
    expect(isMonthCursor("2026-13")).toBe(false);
    expect(isMonthCursor("2026-1")).toBe(false);
    expect(isMonthCursor("26-01")).toBe(false);
    expect(isMonthCursor("2026-01-01")).toBe(false);
    expect(isMonthCursor("")).toBe(false);
  });
});

describe("parseLatestDailies", () => {
  it("round-trips a page serialized as JSON", () => {
    const original = page({
      dailies: [
        summary("2026-03-31"),
        summary("2026-03-30", {
          difficulty: Difficulty.Hard,
          solveStatus: SolveStatus.Failed,
          attempts: 0,
          attemptsToSolve: null,
          languages: [],
          bestRuntime: null,
          hasEditorial: true,
        }),
      ],
    });

    expect(parseLatestDailies(asJson(original))).toEqual(original);
  });

  it("accepts the last page, whose cursor is null", () => {
    const last = page({ hasMore: false, nextCursor: null });

    expect(parseLatestDailies(asJson(last))).toEqual(last);
  });

  it("drops fields the list doesn't know, such as removed legacy ones", () => {
    // `link` and `bestMemory` used to be part of the summary; a cached
    // response from before their removal must not leak them into state.
    const legacy = {
      ...page(),
      extra: "ignored",
      dailies: [
        {
          ...summary("2026-03-31"),
          link: "https://leetcode.com/problems/x/",
          bestMemory: 12,
        },
      ],
    };

    const parsed = parseLatestDailies(asJson(legacy));

    expect(parsed.dailies).toEqual([summary("2026-03-31")]);
    expect(parsed).not.toHaveProperty("extra");
  });

  it("rejects bodies that aren't page objects", () => {
    expect(() => parseLatestDailies(null)).toThrow(TypeError);
    expect(() => parseLatestDailies([])).toThrow(TypeError);
    expect(() => parseLatestDailies("page")).toThrow(TypeError);
    expect(() => parseLatestDailies({ ...page(), dailies: "none" })).toThrow(
      /page\.dailies is not an array/,
    );
  });

  it("rejects enum fields holding values the enums don't declare", () => {
    // Lower-case "easy" is not Difficulty.Easy ("Easy"), and "DONE" is a
    // SolutionStatus value, not a SolveStatus one.
    const withBadDifficulty = {
      ...page(),
      dailies: [{ ...summary("2026-03-31"), difficulty: "easy" }],
    };
    const withBadStatus = {
      ...page(),
      dailies: [{ ...summary("2026-03-31"), solveStatus: "DONE" }],
    };

    expect(() => parseLatestDailies(withBadDifficulty)).toThrow(
      /page\.dailies\[0\]\.difficulty is not one of Easy, Medium, Hard/,
    );
    expect(() => parseLatestDailies(withBadStatus)).toThrow(
      /page\.dailies\[0\]\.solveStatus/,
    );
  });

  it("rejects malformed summary fields", () => {
    const withDaily = (daily: Record<string, unknown>): unknown => ({
      ...page(),
      dailies: [{ ...summary("2026-03-31"), ...daily }],
    });

    expect(() => parseLatestDailies(withDaily({ date: "2026-3-31" }))).toThrow(
      /date is not a YYYY-MM-DD day/,
    );
    expect(() => parseLatestDailies(withDaily({ date: "2026-02-30" }))).toThrow(
      /date is not a YYYY-MM-DD day/,
    );
    expect(() => parseLatestDailies(withDaily({ title: 42 }))).toThrow(
      /title is not a string/,
    );
    expect(() => parseLatestDailies(withDaily({ attempts: -1 }))).toThrow(
      /attempts is not a non-negative integer/,
    );
    expect(() =>
      parseLatestDailies(withDaily({ attemptsToSolve: 1.5 })),
    ).toThrow(/attemptsToSolve is not a non-negative integer/);
    expect(() =>
      parseLatestDailies(withDaily({ languages: ["js", 1] })),
    ).toThrow(/languages\[1\] is not a string/);
    expect(() =>
      parseLatestDailies(withDaily({ bestRuntime: "fast" })),
    ).toThrow(/bestRuntime is not a number or null/);
    expect(() => parseLatestDailies(withDaily({ hasEditorial: 0 }))).toThrow(
      /hasEditorial is not a boolean/,
    );
  });

  it("rejects missing summary fields", () => {
    const partial = Object.fromEntries(
      Object.entries(summary("2026-03-31")).filter(
        ([key]) => key !== "hasEditorial",
      ),
    );

    expect(() => parseLatestDailies({ ...page(), dailies: [partial] })).toThrow(
      /hasEditorial is not a boolean/,
    );
  });

  it("rejects malformed pagination fields", () => {
    expect(() => parseLatestDailies({ ...page(), total: "120" })).toThrow(
      /page\.total/,
    );
    expect(() =>
      parseLatestDailies({ ...page(), nextCursor: "2026-13" }),
    ).toThrow(/page\.nextCursor is not a YYYY-MM month/);
  });

  it("rejects pages whose hasMore and nextCursor disagree", () => {
    // Either combination would leave the "Load previous month" button
    // showing with nothing to load, or hide it while older months remain.
    expect(() =>
      parseLatestDailies({ ...page(), hasMore: true, nextCursor: null }),
    ).toThrow(/disagree/);
    expect(() =>
      parseLatestDailies({ ...page(), hasMore: false, nextCursor: "2026-03" }),
    ).toThrow(/disagree/);
  });
});

describe("fetchDailiesPage", () => {
  it("requests the cursor's month page and validates the body", async () => {
    const requested: string[] = [];

    const result = await fetchDailiesPage("2026-04", async (path) => {
      requested.push(path);
      return Response.json(page());
    });

    expect(requested).toEqual(["/api/dailies/2026-04"]);
    expect(result).toEqual(page());
  });

  it("rejects non-2xx responses with the status", async () => {
    await expect(
      fetchDailiesPage(
        "2026-04",
        async () => new Response(null, { status: 404 }),
      ),
    ).rejects.toThrow(/GET \/api\/dailies\/2026-04 answered HTTP 404/);
  });

  it("rejects 2xx responses whose body isn't a page", async () => {
    await expect(
      fetchDailiesPage("2026-04", async () => Response.json({ dailies: [] })),
    ).rejects.toThrow(TypeError);
  });

  it("propagates network failures", async () => {
    await expect(
      fetchDailiesPage("2026-04", async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).rejects.toThrow("Failed to fetch");
  });
});

describe("daily list state", () => {
  const seed: DailyListSeed = { cursor: "2025-10", hasMore: true, total: 120 };

  function grownState(): DailyListState {
    return {
      olderDailies: [summary("2025-09-30")],
      hasMore: true,
      cursor: "2025-09",
      openMonths: ["2026-04", "2025-09"],
    };
  }

  describe("initialDailyListState", () => {
    it("starts with nothing older loaded and only the current month open", () => {
      expect(initialDailyListState(seed, "2026-04")).toEqual({
        olderDailies: [],
        hasMore: true,
        cursor: "2025-10",
        openMonths: ["2026-04"],
      });
    });
  });

  describe("restoreDailyListState", () => {
    it("starts fresh when nothing was saved", () => {
      expect(restoreDailyListState(null, seed, "2026-04")).toEqual(
        initialDailyListState(seed, "2026-04"),
      );
    });

    it("resumes a snapshot grown from the same first page", () => {
      const snapshot: DailyListSnapshot = {
        seed: { ...seed },
        state: grownState(),
      };

      expect(restoreDailyListState(snapshot, seed, "2026-04")).toEqual(
        grownState(),
      );
    });

    it("discards a snapshot grown from a different first page", () => {
      // A new archived day changes the total, and a month rollover moves
      // the first page's cursor; either way the saved older pages may no
      // longer line up with the server-rendered ones.
      const fresh = initialDailyListState(seed, "2026-04");
      const stale = (staleSeed: DailyListSeed): DailyListSnapshot => ({
        seed: staleSeed,
        state: grownState(),
      });

      expect(
        restoreDailyListState(stale({ ...seed, total: 119 }), seed, "2026-04"),
      ).toEqual(fresh);
      expect(
        restoreDailyListState(
          stale({ ...seed, cursor: "2025-09" }),
          seed,
          "2026-04",
        ),
      ).toEqual(fresh);
      expect(
        restoreDailyListState(
          stale({ ...seed, hasMore: false }),
          seed,
          "2026-04",
        ),
      ).toEqual(fresh);
    });
  });

  describe("appendDailiesPage", () => {
    it("appends the page, advances the cursor and opens its months", () => {
      const state = initialDailyListState(seed, "2026-04");
      const older = page({
        dailies: [summary("2025-09-30"), summary("2025-09-01")],
        hasMore: true,
        nextCursor: "2025-09",
      });

      expect(appendDailiesPage(state, older)).toEqual({
        olderDailies: older.dailies,
        hasMore: true,
        cursor: "2025-09",
        openMonths: ["2026-04", "2025-09"],
      });
    });

    it("keeps open months unique and leaves the input state untouched", () => {
      // The month is already open, e.g. because the reader re-expanded it.
      const state = grownState();
      const last = page({
        dailies: [summary("2025-09-15")],
        hasMore: false,
        nextCursor: null,
      });

      const next = appendDailiesPage(state, last);

      expect(next.openMonths).toEqual(["2026-04", "2025-09"]);
      expect(next.olderDailies.map((d) => d.date)).toEqual([
        "2025-09-30",
        "2025-09-15",
      ]);
      expect(next.hasMore).toBe(false);
      expect(next.cursor).toBeNull();
      expect(state).toEqual(grownState());
    });
  });
});
