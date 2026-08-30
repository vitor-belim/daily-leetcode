Refresh the LeetCode auth cookies in `.env`.

Run this when `npm run fetch-problem` / `fetch-solution` fail with
`Authentication failed: LEETCODE_SESSION or LEETCODE_CSRFTOKEN is invalid or expired.`

1. Run:
   ```bash
   npm run refresh-auth
   ```
   It decrypts `LEETCODE_SESSION` and `csrftoken` out of Chrome's cookie store, writes both into
   `.env`, and verifies them against LeetCode. macOS raises a Keychain prompt for *Chrome Safe
   Storage* — the user approves it once (**Always Allow** stops it recurring). On success it prints
   the signed-in username; report that and stop.
2. On failure, read the message and fix the cause — do not fall back to reading cookies out of the
   browser. There is no browser-side route: `LEETCODE_SESSION` is `HttpOnly`, so it is absent from
   `document.cookie`, unreadable from the DevTools panel by any tool, and Chrome does not expose the
   `Cookie` header to extensions. The cookie store is the only source.
   - `Could not read "Chrome Safe Storage"` — the Keychain prompt was denied or dismissed. Ask the
     user to rerun and approve it.
   - `EPERM` / `operation not permitted` reading the profile — the terminal lacks **Full Disk
     Access**. Tell the user to grant it in System Settings -> Privacy & Security -> Full Disk
     Access and restart the terminal. Do not attempt to work around this.
   - `No signed-in LeetCode session found` — Chrome is not logged in. Open `https://leetcode.com`
     with `mcp__claude-in-chrome__navigate` and ask the user to log in, then rerun step 1.
   - `Authentication failed` after a successful write — the Chrome session itself is stale. Same
     fix: have the user reload `https://leetcode.com` in Chrome, confirm it shows them signed in,
     then rerun step 1.

### Important:
- Never echo either cookie value into the chat, into a `git` command, or into a Bash command line.
  The script moves them straight into `.env`; confirm by naming the keys, not the values.
- `updateEnvFile` leaves every other line in `.env` untouched — comments, blank lines, unrelated
  keys. Do not hand-edit `.env` around it.
- Do not commit `.env`; it is gitignored and must stay that way.
