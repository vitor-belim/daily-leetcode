import { Button, buttonVariants } from "@/components/ui/button";
import { formatLongDate } from "@/lib/date-display";
import { blogPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

/** Which neighbor of the current day an {@link AdjacentDayLink} leads to. */
export enum AdjacentDirection {
  Previous = "previous",
  Next = "next",
}

/** How one direction of the day-to-day navigation is labelled and drawn. */
interface AdjacentDirectionStyle {
  /** Accessible name prefix of the link, completed with the target day. */
  label: string;
  /** Accessible name of the disabled control when there is no neighbor. */
  emptyLabel: string;
  /** Link relation to the current page, `prev` or `next`. */
  rel: string;
  icon: LucideIcon;
}

const ADJACENT_DIRECTION_STYLES: Record<
  AdjacentDirection,
  AdjacentDirectionStyle
> = {
  [AdjacentDirection.Previous]: {
    label: "Previous challenge",
    emptyLabel: "No previous challenge",
    rel: "prev",
    icon: ChevronLeft,
  },
  [AdjacentDirection.Next]: {
    label: "Next challenge",
    emptyLabel: "No next challenge",
    rel: "next",
    icon: ChevronRight,
  },
};

export interface AdjacentDayLinkProps {
  direction: AdjacentDirection;
  /** The neighboring archived day as `YYYY-MM-DD`, or null when none. */
  date: string | null;
}

/**
 * Links to the archived day before or after the current one. The link is a
 * plain anchor styled as an icon button, so assistive technology announces
 * it as a link named after the day it leads to; without a neighbor it
 * becomes a disabled button that still says why it does nothing.
 *
 * @param direction Whether the link goes to the previous or the next day.
 * @param date The neighboring day as `YYYY-MM-DD`, or null when there is
 *   none.
 * @returns The link, or the disabled button when `date` is null.
 */
export function AdjacentDayLink({ direction, date }: AdjacentDayLinkProps) {
  const {
    label,
    emptyLabel,
    rel,
    icon: Icon,
  } = ADJACENT_DIRECTION_STYLES[direction];
  const icon = <Icon className="w-3 h-3" strokeWidth={1.5} />;

  if (date === null) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        disabled
        aria-label={emptyLabel}
      >
        {icon}
      </Button>
    );
  }

  return (
    <Link
      href={blogPath(date)}
      rel={rel}
      aria-label={`${label}, ${formatLongDate(date)}`}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-xs" }),
        "rounded-full",
      )}
    >
      {icon}
    </Link>
  );
}
