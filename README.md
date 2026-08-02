# Daily LeetCode

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

A web application that tracks and displays daily LeetCode challenges and the solutions I (Vítor Belim) came up with.

> **Disclaimer**: Most of this application's code was generated or assisted by AI.

## Follow my progress here: [https://daily-leetcode-gamma.vercel.app/](https://daily-leetcode-gamma.vercel.app/)

## 🚀 Overview

This project automatically fetches the LeetCode "Question of the Day" and allows users to view descriptions and browse solutions. It uses a file-based data system (JSON) to store problem details and solution implementations.

### Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Base UI](https://base-ui.com/) (primary primitives) & [Radix UI](https://www.radix-ui.com/) (`Progress`)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Syntax Highlighting**: [Shiki](https://shiki.style/)
- **AI Integration**: the `/explain` Claude Code command (generates solution explanations)
- **Runtime/Tools**: [Node.js](https://nodejs.org/), [tsx](https://github.com/privatenumber/tsx)

## 📋 Requirements

- Node.js (Latest LTS recommended)
- npm (Package Manager)
- LeetCode Account (for fetching submissions)

## 🔐 Authentication & Configuration

1. Create a `.env` file in the root directory (see `scripts/README.md` for the full list of variables the scripts read).
2. **LeetCode Credentials**: Required to fetch your own solutions.
   - Login to [LeetCode](https://leetcode.com) in your browser.
   - Open DevTools -> Application -> Cookies -> `https://leetcode.com`.
   - Copy the value of `LEETCODE_SESSION` and `csrftoken`.
3. Update `.env`:
   ```env
   LEETCODE_SESSION=your_session_cookie
   LEETCODE_CSRFTOKEN=your_csrftoken
   ```

## 🛠️ Setup & Run

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

3. **Build for production:**

   ```bash
   npm run build
   npm run start
   ```

## 📜 Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Builds the application for production. |
| `npm run start` | Starts the production server. |
| `npm run lint` | Runs ESLint for code quality checks. |
| `npm run typecheck` | Runs the TypeScript compiler in `--noEmit` mode. |
| `npm run test` | Runs the Vitest suite (covers nearly all of `lib/` — see [`scripts/README.md`](scripts/README.md)). |
| `npm run fetch-daily` | Fetches both halves of a day: `fetch-problem` followed by `fetch-solution`. |
| `npm run fetch-problem` | Fetches a day's LeetCode daily challenge into `data/problems/`. |
| `npm run fetch-solution` | Fetches your submissions for a day's challenge into `data/solutions/`. |
| `npm run backfill` | Finds days in `data/` missing a problem or solutions and backfills them via `fetch-problem`/`fetch-solution` + the `/explain` command. |

See [`scripts/README.md`](scripts/README.md) for details on all CLI scripts and required env vars.

### Fetching Daily Challenge

To fetch both halves of a day at once:
```bash
npm run fetch-daily -- 2026-06-01
```

The two halves are also separate scripts, so a day whose problem is already archived can have its solutions pulled without re-fetching the problem:
```bash
npm run fetch-problem -- 2026-06-01
npm run fetch-solution -- 2026-06-01
```

All three take the same optional date argument, and default to today if none is provided.

## 📂 Project Structure

- `app/`: Next.js App Router pages, layouts, and global styles.
- `components/`: Reusable UI components (Shadcn UI + custom).
  - `ui/`: Base components from Shadcn.
- `data/`: JSON storage for problem descriptions and solutions.
  - `problems/YYYY/MM/DD.json`: Daily challenge metadata.
  - `solutions/YYYY/MM/DD.json`: Your solution implementation and AI explanation.
- `lib/`: Shared utilities, TypeScript types, and data access, split by responsibility rather than bundled into one "data" file:
  - `actions.ts`: the only `"use server"` file left — a thin wrapper around `problems-repo.ts` for the one function (`getLatestDailies`) actually called from a Client Component.
  - `problems-repo.ts` / `solutions-repo.ts`: plain (non-`"use server"`) data-access modules for reading `data/problems`/`data/solutions` — used directly by Server Components, never client-reachable, so they're safe to unit test with fixture directories.
  - `dates.ts`, `paths.ts`, `archive.ts`, `types.ts`: shared between the app and the CLI scripts.
  - `leetcode-api.ts`, `problems.ts`, `solutions.ts`: CLI-only (LeetCode API client, challenge-to-`Problem` mapping, submission-to-`Solution` mapping).
  - `utils.ts` (`cn`, pinned by `components.json`), `date-display.ts` (local-time display formatting), `markdown.ts` (markdown/LaTeX-ish → HTML).

  See [`scripts/README.md`](scripts/README.md) for the CLI-facing modules.
- `scripts/`: CLI entrypoints (`fetch-problem.ts`, `fetch-solution.ts`, `backfill.ts`); their logic lives in `lib/` alongside the app's own modules.
- `public/`: Static assets.

## 🧪 Tests

```bash
npm run lint       # static analysis
npm run typecheck  # tsc --noEmit
npm run test       # Vitest — covers nearly all of lib/, see scripts/README.md
```

## 🛠️ TODOs

- [ ] Implement automated CI/CD for fetching daily challenges.
- [ ] Add tests for `lib/leetcode-api.ts` (needs network mocking) — the last untested module besides the intentionally-trivial `lib/actions.ts`.
- [ ] Add support for multiple programming languages in solutions.
