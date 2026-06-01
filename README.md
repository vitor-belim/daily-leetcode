# Daily LeetCode

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

A web application that tracks and displays daily LeetCode challenges and their solutions.

> **Disclaimer**: Most of this application's code was generated or assisted by AI.

## 🚀 Overview

This project automatically fetches the LeetCode "Question of the Day" and allows users to view descriptions and browse solutions. It uses a file-based data system (JSON) to store problem details and solution implementations.

### Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Syntax Highlighting**: [Shiki](https://shiki.style/)
- **Runtime/Tools**: [Node.js](https://nodejs.org/), [tsx](https://github.com/privatenumber/tsx)

## 📋 Requirements

- Node.js (Latest LTS recommended)
- npm (Package Manager)

## 🔐 Authentication

1. Open `.env` and fill it with your LeetCode credentials.
2. How to get your credentials:
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
| `npm run fetch-daily` | Fetches the current LeetCode daily challenge via GraphQL and saves it to `data/problems`. |

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
  - `blog/[year]/[month]/[day]/`: Dynamic routes for daily solutions.
- `components/`: Reusable UI components (Shadcn UI + custom).
- `data/`: JSON storage for problem descriptions and solutions.
  - `problems/`: Daily challenge metadata and descriptions.
  - `solutions/`: Implementations for the challenges.
- `lib/`: Utility functions and data fetching logic.
- `scripts/`: CLI utilities (e.g., `fetch-daily.ts`).
- `public/`: Static assets.

## 🔑 Environment Variables

Currently, this project does not require specific environment variables for basic operation. 
*(TODO: Add LEETCODE_SESSION or other auth variables if private problem fetching is implemented.)*

## 🧪 Tests

*(TODO: Implement unit and integration tests.)*

Currently, the project uses ESLint for static analysis:
```bash
npm run lint
```
