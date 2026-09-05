# scripts/

CLI utilities for maintaining the `data/` archive, run via `tsx` (no build step).

## Environment variables

Set these in `.env` at the project root:

| Variable             | Required | Purpose                                                                |
| :------------------- | :------- | :--------------------------------------------------------------------- |
| `LEETCODE_SESSION`   | Yes      | LeetCode session cookie, used to authenticate GraphQL requests.        |
| `LEETCODE_CSRFTOKEN` | Yes      | LeetCode CSRF token, sent alongside the session cookie.                |
| `LEETCODE_USERNAME`  | No       | `author` field on fetched solutions. Falls back to `"Vitor"` if unset. |

Both LeetCode variables expire every few weeks; `npm run refresh-auth` refills them from Chrome.

## Commands

All fetch commands default to today (LeetCode's UTC day) if no date is given. Problem and solution fetching are deliberately separate: the two halves of a day fill in at different times (the problem exists from midnight, your solutions only once you've solved it), so fetching one must never force a re-fetch of the other.

### `npm run fetch-daily -- [YYYY-MM-DD]`

Convenience wrapper that runs `fetch-problem` and then `fetch-solution` for the same date, stopping if the first fails. Defined in `package.json` rather than as its own script file — it's a shell function purely so the date argument reaches *both* commands; a plain `npm run fetch-problem && npm run fetch-solution` chain would pass it to the second one only.

### `npm run fetch-problem -- [YYYY-MM-DD]`

Fetches one day's LeetCode daily challenge — title, difficulty, description, link — and writes `data/problems/YYYY/MM/DD.json`, overwriting any existing file.

### `npm run fetch-solution -- [YYYY-MM-DD]`

Fetches your submissions for one day's challenge and writes `data/solutions/YYYY/MM/DD.json`.

Note that this fetches **every submission you have ever made to that problem**, not just the ones from the challenge day itself — if you solved the problem two years before it came up as a daily, those old submissions are included too (with their original timestamps). Fetching is capped at the 200 most recent submissions per problem; anything older is left out with a warning.

Never overwrites an existing solutions file. If you haven't solved the day yet:

- while the day is still in progress, no solutions file is written at all, so the day is retried on a later run instead of being marked done;
- once the day is over, an empty `[]` file is written to record that it went unsolved, so it isn't re-fetched on every later run.

Note that because an existing file is never overwritten, solving a past daily after its empty file was written needs that file deleted before the solutions can be fetched.

Resolves the question slug from `data/problems/YYYY/MM/DD.json` when that file exists, costing no extra API call; only a date with no problem file on disk falls back to the daily-challenge lookup.

### `npm run backfill -- [--from YYYY-MM-DD]`

Finds every day that is missing a problem (including interior gaps) or is missing complete solutions, and for each one:

1. Runs `fetch-problem` for that date, if the problem file is missing.
2. Runs `fetch-solution` for that date, if the solutions file is missing.
3. Runs `claude -p "/explain <date>" --model haiku` if a solutions file is present and has solutions still needing an explanation — skipped otherwise, since `/explain` would just no-op. Pinned to Haiku since explaining already-written code is cheap work that doesn't need a larger model.
4. Re-checks the solutions file to confirm every solution got a non-empty `aiExplanation`.

A day recorded as unsolved (an empty `[]` solutions file) counts as complete and is not revisited.

The scan normally starts at the oldest archived day. Pass `--from YYYY-MM-DD` to start earlier and pull in history that predates the archive, e.g. `npm run backfill -- --from 2026-01-01`; days before the archive on which you never submitted get an empty `[]` solutions file, so they show up as unsolved rather than being re-fetched every run.

Steps 1 and 2 are independent, so a day whose problem is already archived but whose solutions are missing is topped up without re-fetching and rewriting the problem.

Exits non-zero if any day had a fetch or explain issue, after finishing everything it can.

### `npm run refresh-auth`

Refills `LEETCODE_SESSION` and `LEETCODE_CSRFTOKEN` in `.env` from the Chrome profile you are signed into, then verifies them against LeetCode and prints the username. Run it whenever a fetch fails with `Authentication failed: LEETCODE_SESSION or LEETCODE_CSRFTOKEN is invalid or expired.`

It reads the cookies from Chrome's own store rather than the browser UI, because `LEETCODE_SESSION` is an `HttpOnly` cookie: it never appears in `document.cookie`, no extension or automation tool can read it out of the DevTools panel, and Chrome's network stack does not expose the `Cookie` header to extensions. The cookie store is the only place the value is reachable without copying it by hand.

macOS specifics, all of them reasons this script is not portable as-is:

- Cookie values in `~/Library/Application Support/Google/Chrome/<Profile>/Cookies` are encrypted with AES-128-CBC. The key is PBKDF2-HMAC-SHA1 over the *Chrome Safe Storage* password from the login Keychain — salt `saltysalt`, 1003 iterations, 16 bytes, IV of 16 spaces. Linux Chrome uses the same scheme with a different password and 1 iteration; Windows uses DPAPI instead.
- Reading that password shells out to `security find-generic-password`, which raises a Keychain dialog. Choosing **Always Allow** stops it recurring.
- The database is copied to a temp file before being queried, because Chrome holds the live one open.
- Since Chrome 118 each decrypted value is prefixed with the SHA-256 of the cookie's `host_key`; the script strips that prefix only when it actually matches, so older rows still decrypt correctly.
- Reading the profile directory at all requires the terminal (or whatever runs the script) to hold **Full Disk Access** in System Settings → Privacy & Security. Without it the copy fails with `EPERM`.

Every profile is searched, `Default` first, and the first one holding both cookies wins — so it works when you are signed into LeetCode in a secondary Chrome profile.

## Shared modules (`lib/`)

These scripts are thin CLI orchestrators; shared logic lives in `lib/` alongside the Next.js app's modules:

- `lib/types.ts` — `Problem`/`Solution` types.
- `lib/paths.ts` — `data/problems|solutions/YYYY/MM/DD.json` path convention, `solutionFileExists`, `writeJsonFile`.
- `lib/dates.ts` — UTC-only date primitives (deliberately UTC, not local time, to match LeetCode's daily rollover).
- `lib/archive.ts` — `collectFilledDates` / `getMissingDates` for missing-day detection.
- `lib/leetcode-api.ts` — GraphQL queries and the authenticated fetch client (CLI-only).
- `lib/chrome-cookies.ts` — reads and decrypts LeetCode cookies out of Chrome's macOS cookie store (CLI-only).
- `lib/env-file.ts` — rewrites `NAME=value` lines in `.env` without disturbing the rest of the file.
- `lib/problems.ts` — maps a LeetCode daily challenge to the app's `Problem` shape, normalizes its link and recovers the question slug from one (CLI-only).
- `lib/solutions.ts` — maps a LeetCode submission to the app's `Solution` shape and dedupes by code (CLI-only).

Note: don't add the `server-only` package to any of these — it breaks resolution under plain `tsx`/Vitest, which these scripts and their tests rely on.

## Tests

`npm run test` runs the Vitest suite in `lib/*.test.ts`, covering nearly all of `lib/`. Untested: `lib/leetcode-api.ts` (needs network mocking) and `lib/actions.ts` (a one-line delegating wrapper).

`lib/chrome-cookies.test.ts` covers the decryption path only — it encrypts fixtures exactly as Chrome does and asserts they round-trip, including the Chrome 118+ domain-hash prefix and a full trailing padding block. The Keychain lookup and the profile scan are not tested, since both depend on the local machine's Chrome install.
