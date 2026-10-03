/** An error caught by an error boundary, as Next.js passes it in. */
export interface DigestedError extends Error {
  /** Hash of a server-side error, matching the entry in the server logs. */
  digest?: string;
}

/** The props Next.js passes to `app/error.tsx` and `app/global-error.tsx`. */
export interface ErrorBoundaryProps {
  error: DigestedError;
  /** Re-fetches and re-renders the boundary's children. */
  unstable_retry: () => void;
}
