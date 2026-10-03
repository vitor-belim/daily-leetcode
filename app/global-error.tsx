"use client";

import type { ErrorBoundaryProps } from "@/components/error-boundary-props";
import { Button, buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";
import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <title>{`Something went wrong · ${SITE_NAME}`}</title>
        <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
          <div className="max-w-md space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {SITE_NAME} · Error
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              The site failed to load. Trying again often helps; if it
              doesn&apos;t, the challenge log is still a click away.
            </p>
            {error.digest !== undefined && (
              <p className="text-xs text-muted-foreground">
                Reference: <code>{error.digest}</code>
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => unstable_retry()}>Try again</Button>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Back to the challenge log
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
