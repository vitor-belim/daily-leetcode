import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {SITE_NAME} · 404
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          No challenge here
        </h1>
        <p className="text-muted-foreground">
          That day isn&apos;t in the archive yet, or the address doesn&apos;t
          point to a challenge.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to the challenge log
        </Link>
      </div>
    </main>
  );
}
