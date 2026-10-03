import type { ErrorInfo } from "next/error";

/** An error caught by an error boundary, as Next.js passes it in. */
export interface DigestedError extends Error {
  /** Hash of a server-side error, matching the entry in the server logs. */
  digest?: string;
}

/**
 * The props Next.js passes to `app/error.tsx` and `app/global-error.tsx`:
 * Next's own `ErrorInfo` (`retry` re-fetches and re-renders the boundary's
 * children, `reset` re-renders them without re-fetching), with `error`
 * narrowed to a {@link DigestedError}. Deriving from `ErrorInfo` means a
 * future rename of those callbacks fails type-checking instead of leaving a
 * "Try again" button that calls `undefined`.
 */
export interface ErrorBoundaryProps extends Omit<ErrorInfo, "error"> {
  error: DigestedError;
}
