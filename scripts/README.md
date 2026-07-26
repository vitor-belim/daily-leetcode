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

### `npm run fetch-daily -- [YYYY-MM-DD]`

Fetches one day's LeetCode daily challenge plus your accepted submissions for it, writing `data/problems/YYYY/MM/DD.json` and `data/solutions/YYYY/MM/DD.json`. Defaults to today (LeetCode's UTC day) if no date is given.

Never overwrites an existing solutions file. If you haven't solved the day yet, no solutions file is written at all, so the day is retried on a later run instead of being marked done.

### `npm run backfill`

Finds every missing day in `data/problems/` (including interior gaps) and, for each one:

1. Runs `fetch-daily` for that date.
2. Runs `claude -p "/explain <date>"` if a solutions file was written — skipped otherwise, since `/explain` would just no-op.
3. Re-checks the solutions file to confirm every solution got a non-empty `aiExplanation`.

Exits non-zero if any day had a fetch or explain issue, after finishing everything it can.

## Shared modules (`lib/`)

These scripts are thin CLI orchestrators; shared logic lives in `lib/` alongside the Next.js app's modules:

- `lib/types.ts` — `Problem`/`Solution` types.
- `lib/paths.ts` — `data/problems|solutions/YYYY/MM/DD.json` path convention, `solutionFileExists`, `writeJsonFile`.
- `lib/dates.ts` — UTC-only date primitives (deliberately UTC, not local time, to match LeetCode's daily rollover).
- `lib/archive.ts` — `collectFilledDates` / `getMissingDates` for missing-day detection.
- `lib/leetcode-api.ts` — GraphQL queries and the authenticated fetch client (CLI-only).
- `lib/solutions.ts` — maps a LeetCode submission to the app's `Solution` shape and dedupes by code (CLI-only).

Note: don't add the `server-only` package to any of these — it breaks resolution under plain `tsx`/Vitest, which these scripts and their tests rely on.

## Tests

`npm run test` runs the Vitest suite in `lib/*.test.ts`, covering nearly all of `lib/`. Untested: `lib/leetcode-api.ts` (needs network mocking) and `lib/actions.ts` (a one-line delegating wrapper).
