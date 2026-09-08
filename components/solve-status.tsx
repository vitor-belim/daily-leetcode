import { SolveStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleX, Clock, Timer } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/** The visual treatment of one `SolveStatus`, shared by badge and icon. */
export interface SolveStatusStyle {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Text and background classes for the badge. */
  badgeClassName: string;
  /** Text color class for the standalone icon. */
  iconClassName: string;
  /** Background tint and hover classes for a whole list row. */
  rowClassName: string;
}

export const SOLVE_STATUS_STYLES: Record<SolveStatus, SolveStatusStyle> = {
  [SolveStatus.Solved]: {
    label: "Solved",
    icon: CircleCheck,
    badgeClassName:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    rowClassName:
      "bg-emerald-50/70 hover:bg-emerald-100/80 focus-visible:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:focus-visible:bg-emerald-950/50",
  },
  [SolveStatus.FunctionallyCorrect]: {
    label: "Functionally correct",
    icon: Timer,
    badgeClassName:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    iconClassName: "text-yellow-600 dark:text-yellow-400",
    rowClassName:
      "bg-yellow-50/70 hover:bg-yellow-100/80 focus-visible:bg-yellow-100/80 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50 dark:focus-visible:bg-yellow-950/50",
  },
  [SolveStatus.Failed]: {
    label: "Failed/not attempted",
    icon: CircleX,
    badgeClassName:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    iconClassName: "text-rose-600 dark:text-rose-400",
    rowClassName:
      "bg-rose-50/70 hover:bg-rose-100/80 focus-visible:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:focus-visible:bg-rose-950/50",
  },
  [SolveStatus.Pending]: {
    label: "In progress",
    icon: Clock,
    badgeClassName:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    iconClassName: "text-amber-600 dark:text-amber-400",
    rowClassName:
      "bg-amber-50/70 hover:bg-amber-100/80 focus-visible:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:focus-visible:bg-amber-950/50",
  },
};

interface SolveStatusIconProps {
  status: SolveStatus;
  className?: string;
}

export function SolveStatusIcon({ status, className }: SolveStatusIconProps) {
  const { label, icon: Icon, iconClassName } = SOLVE_STATUS_STYLES[status];

  return (
    <Icon
      aria-label={label}
      role="img"
      className={cn("size-5 shrink-0", iconClassName, className)}
    />
  );
}
