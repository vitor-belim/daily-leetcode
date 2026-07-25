# scripts/

CLI utilities for maintaining the `data/` archive, run via `tsx` (no build step).

## Environment variables

Set these in `.env` at the project root:

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `LEETCODE_SESSION` | Yes | LeetCode session cookie, used to authenticate GraphQL requests. |
| `LEETCODE_CSRFTOKEN` | Yes | LeetCode CSRF token, sent alongside the session cookie. |
| `LEETCODE_USERNAME` | No | Used as the `author` field on fetched solutions. Falls back to `"Vitor"` if unset — this is not currently set in `.env`, so solutions default to that fallback. |

`fetch-daily.ts` fails fast with a clear error if `LEETCODE_SESSION`/`LEETCODE_CSRFTOKEN` are missing, rather than making an anonymous request and reporting a misleading "invalid or expired" auth error.

## Commands

### `npm run fetch-daily -- [YYYY-MM-DD]`

Fetches one day's LeetCode daily challenge plus your own accepted submissions for it, writing:
- `data/problems/YYYY/MM/DD.json` — problem metadata (always overwritten).
- `data/solutions/YYYY/MM/DD.json` — your submissions, deduplicated by code (written only once; see invariants below).

If no date is given, fetches today's challenge (per LeetCode's UTC day).

**Invariants:**
- Never overwrites an existing solutions file — if `data/solutions/YYYY/MM/DD.json` already exists, the run exits early without touching it.
- If zero submissions exist yet for the day (you haven't solved it), **no solutions file is written**, so the day is naturally retried on the next run instead of being permanently marked with a fake placeholder.
- Submissions sharing identical `code` are deduplicated by keeping whichever one has the higher combined cpu+memory percentile score — all fields come from that single submission, never spliced across two different submissions.

### `npm run backfill`

Finds every missing day in `data/problems/` between the earliest recorded day and today (including interior gaps, not just days after the most recent one), then for each missing day:
1. Runs `fetch-daily` for that date (failures are logged and skipped — one bad day doesn't abort the rest).
2. Batches the successfully-fetched days into groups of up to **4** and runs `claude -p "/explain <date1> <date2> ...>"` once per batch (fewer `claude` invocations than one-per-day).
3. Re-reads each date's solutions file afterward to confirm every solution actually got a non-empty `aiExplanation` — a `claude -p` exit code of `0` alone doesn't prove anything was written, since `/explain` is instructed to skip missing files silently.

Exits non-zero if any day had a fetch or explain issue, after finishing everything it can.

## Shared modules (`lib/`)

These scripts are thin CLI orchestrators; their logic lives in `lib/` alongside the Next.js app's own modules, since it's plain, dependency-free TypeScript with no reason to duplicate. Some of these are genuinely shared with the app; others are CLI-only:

| Module | Responsibility | Also used by the app? |
| :--- | :--- | :--- |
| `lib/types.ts` | `Problem`/`Solution` shared types. | Yes |
| `lib/paths.ts` | `data/problems\|solutions/YYYY/MM/DD.json` path convention (with an optional root override for tests) + `writeJsonFile` (2-space indent, no trailing newline — keep byte-identical to existing files). | Yes — `lib/problems-repo.ts` / `lib/solutions-repo.ts` |
| `lib/dates.ts` | UTC-only date primitives, including `shiftDateUTC` for adjacent-day navigation. **Deliberately UTC**, not local time: LeetCode's daily challenge rolls over at UTC midnight, and a prior local-time bug caused off-by-one failures near midnight outside UTC+0. | Yes |
| `lib/archive.ts` | `collectFilledDates` / `getMissingDates` — scans `data/problems/` with regex + real calendar-date validation (rejects stray non-date files, doesn't assume the newest year/month folder has data). | Yes — `lib/problems-repo.ts`'s homepage listing |
| `lib/leetcode-api.ts` | All GraphQL query strings, response types, and the authenticated fetch client, including paginated + throttled submission fetching. | No — CLI-only |
| `lib/solutions.ts` | Maps a LeetCode submission to the app's `Solution` shape and deduplicates by code (submission-building, for `fetch-daily.ts`). Not to be confused with `lib/solutions-repo.ts` (reads already-committed solutions for the app). | No — CLI-only |

**Note on the `server-only` package:** it was tried and deliberately dropped. It throws unless resolved under Next's `react-server` condition — which neither plain `tsx` (how these scripts run) nor Vitest's default resolution sets — so adding it to any module reachable from `scripts/` or from a `*.test.ts` file breaks that consumer outright. Since every module in `lib/` is either exercised by the CLI directly or has its own Vitest suite, there was no file it could safely go on without sacrificing either the scripts or their tests. The client/server boundary is protected the ordinary way instead: Next's bundler already fails hard (not silently) if a Client Component tries to import something using `fs`, and nothing in `app/`/`components/` does today (verified via grep).

Subprocess/CLI-specific logic (`execFileSync` calls, batching, explain-verification) stays local to `backfill.ts` rather than being shared, since it encodes that script's own policy, not a reusable concern.

## Tests

`npm run test` runs the Vitest suite in `lib/*.test.ts`. This now covers nearly all of `lib/`: date arithmetic/validation, missing-day detection (including interior gaps), submission status mapping and dedup, path construction, the problem/solution/adjacent-date data-access functions (via `fs.mkdtempSync` fixtures), `cn`, date-display formatting, and `markdownToHtml`. Only `lib/leetcode-api.ts` (needs network mocking, not attempted) and `lib/actions.ts` (a one-line delegating wrapper with no logic of its own) are untested.
