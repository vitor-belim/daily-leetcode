# Daily LeetCode

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

A web application that tracks and displays daily LeetCode challenges and the solutions I (Vítor Belim) came up with.

> **Disclaimer**: Most of this application's code was generated or assisted by AI.

## 🚀 Overview

This project automatically fetches the LeetCode "Question of the Day" and allows users to view descriptions and browse solutions. It uses a file-based data system (JSON) to store problem details and solution implementations.

### Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Syntax Highlighting**: [Shiki](https://shiki.style/)
- **AI Integration**: [Google Gemini AI](https://ai.google.dev/) (for solution explanations)
- **Runtime/Tools**: [Node.js](https://nodejs.org/), [tsx](https://github.com/privatenumber/tsx)

## 📋 Requirements

- Node.js (Latest LTS recommended)
- npm (Package Manager)
- LeetCode Account (for fetching submissions)
- Google Gemini API Key (optional, for AI explanations)

## 🔐 Authentication & Configuration

1. Create a `.env` file in the root directory based on `.env.example` (or create it manually).
2. **LeetCode Credentials**: Required to fetch your own solutions.
   - Login to [LeetCode](https://leetcode.com) in your browser.
   - Open DevTools -> Application -> Cookies -> `https://leetcode.com`.
   - Copy the value of `LEETCODE_SESSION` and `csrftoken`.
3. **Gemini API Key**: Optional, used to generate simple explanations for solutions.
4. Update `.env`:
   ```env
   LEETCODE_SESSION=your_session_cookie
   LEETCODE_CSRFTOKEN=your_csrftoken
   GEMINI_API_KEY=your_gemini_api_key
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
| `npm run fetch-daily` | Fetches the current LeetCode daily challenge and your latest accepted submission. |

### Fetching Daily Challenge

You can fetch a specific date by passing an argument:
```bash
npm run fetch-daily 2026-06-01
```
If no date is provided, it defaults to today.

## 📂 Project Structure

- `app/`: Next.js App Router pages, layouts, and global styles.
- `components/`: Reusable UI components (Shadcn UI + custom).
  - `ui/`: Base components from Shadcn.
- `data/`: JSON storage for problem descriptions and solutions.
  - `problems/YYYY/MM/DD.json`: Daily challenge metadata.
  - `solutions/YYYY/MM/DD.json`: Your solution implementation and AI explanation.
- `lib/`: Shared utilities, TypeScript types, and data fetching logic.
- `scripts/`: CLI utilities (e.g., `fetch-daily.ts`).
- `public/`: Static assets.

## 🧪 Tests

Currently, you can run:
```bash
npm run lint
```
for static analysis.

## 🛠️ TODOs

- [ ] Implement automated CI/CD for fetching daily challenges.
- [ ] Add unit tests for `lib/` utilities.
- [ ] Improve UI for mobile responsiveness.
- [ ] Add support for multiple programming languages in solutions.
