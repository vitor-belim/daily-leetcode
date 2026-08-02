# scripts/

CLI utilities for maintaining the `data/` archive, run via `tsx` (no build step).

## Environment variables

Set these in `.env` at the project root:

| Variable             | Required | Purpose                                                                |
| :------------------- | :------- | :--------------------------------------------------------------------- |
| `LEETCODE_SESSION`   | Yes      | LeetCode session cookie, used to authenticate GraphQL requests.        |
| `LEETCODE_CSRFTOKEN` | Yes      | LeetCode CSRF token, sent alongside the session cookie.                |
| `LEETCODE_USERNAME`  | No       | `author` field on fetched solutions. Falls back to `"Vitor"` if unset. |

## Commands

All fetch commands default to today (LeetCode's UTC day) if no date is given. Problem and solution fetching are deliberately separate: the two halves of a day fill in at different times (the problem exists from midnight, your solutions only once you've solved it), so fetching one must never force a re-fetch of the other.

### `npm run fetch-daily -- [YYYY-MM-DD]`

Convenience wrapper that runs `fetch-problem` and then `fetch-solution` for the same date, stopping if the first fails. Defined in `package.json` rather than as its own script file — it's a shell function purely so the date argument reaches *both* commands; a plain `npm run fetch-problem && npm run fetch-solution` chain would pass it to the second one only.

### `npm run fetch-problem -- [YYYY-MM-DD]`

Fetches one day's LeetCode daily challenge — title, difficulty, description, link — and writes `data/problems/YYYY/MM/DD.json`, overwriting any existing file.

### `npm run fetch-solution -- [YYYY-MM-DD]`

Fetches your submissions for one day's challenge and writes `data/solutions/YYYY/MM/DD.json`.

Never overwrites an existing solutions file. If you haven't solved the day yet:

- while the day is still in progress, no solutions file is written at all, so the day is retried on a later run instead of being marked done;
- once the day is over, an empty `[]` file is written to record that it went unsolved, so it isn't re-fetched on every later run.

Note that because an existing file is never overwritten, solving a past daily after its empty file was written needs that file deleted before the solutions can be fetched.

Resolves the question slug from `data/problems/YYYY/MM/DD.json` when that file exists, costing no extra API call; only a date with no problem file on disk falls back to the daily-challenge lookup.

### `npm run backfill`

Finds every day that is missing a problem (including interior gaps) or is missing complete solutions, and for each one:

1. Runs `fetch-problem` for that date, if the problem file is missing.
2. Runs `fetch-solution` for that date, if the solutions file is missing.
3. Runs `claude -p "/explain <date>"` if a solutions file is present and has solutions still needing an explanation — skipped otherwise, since `/explain` would just no-op.
4. Re-checks the solutions file to confirm every solution got a non-empty `aiExplanation`.

A day recorded as unsolved (an empty `[]` solutions file) counts as complete and is not revisited.

Steps 1 and 2 are independent, so a day whose problem is already archived but whose solutions are missing is topped up without re-fetching and rewriting the problem.

Exits non-zero if any day had a fetch or explain issue, after finishing everything it can.

## Shared modules (`lib/`)

These scripts are thin CLI orchestrators; shared logic lives in `lib/` alongside the Next.js app's modules:

- `lib/types.ts` — `Problem`/`Solution` types.
- `lib/paths.ts` — `data/problems|solutions/YYYY/MM/DD.json` path convention, `solutionFileExists`, `writeJsonFile`.
- `lib/dates.ts` — UTC-only date primitives (deliberately UTC, not local time, to match LeetCode's daily rollover).
- `lib/archive.ts` — `collectFilledDates` / `getMissingDates` for missing-day detection.
- `lib/leetcode-api.ts` — GraphQL queries and the authenticated fetch client (CLI-only).
- `lib/problems.ts` — maps a LeetCode daily challenge to the app's `Problem` shape, normalizes its link and recovers the question slug from one (CLI-only).
- `lib/solutions.ts` — maps a LeetCode submission to the app's `Solution` shape and dedupes by code (CLI-only).

Note: don't add the `server-only` package to any of these — it breaks resolution under plain `tsx`/Vitest, which these scripts and their tests rely on.

## Tests

`npm run test` runs the Vitest suite in `lib/*.test.ts`, covering nearly all of `lib/`. Untested: `lib/leetcode-api.ts` (needs network mocking) and `lib/actions.ts` (a one-line delegating wrapper).
