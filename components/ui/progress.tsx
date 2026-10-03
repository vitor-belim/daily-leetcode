"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { SITE_LANGUAGE } from "@/lib/site";
import { cn } from "@/lib/utils";

function Progress({
  className,
  locale = SITE_LANGUAGE,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full", className)}
      locale={locale}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-full overflow-hidden rounded-full bg-primary/20"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full bg-primary transition-all"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
