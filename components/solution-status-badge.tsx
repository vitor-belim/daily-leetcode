import { Badge } from "@/components/ui/badge";
import { SolutionStatus } from "@/lib/types";

interface SolutionStatusBadgeProps {
  status: SolutionStatus;
}

/**
 * Solid fill and text color per status. Each pairing is fixed rather than
 * left to the theme's `primary-foreground`, which flips to near-black in dark
 * mode, so a badge reads the same in both themes and clears the 4.5:1 WCAG
 * AA contrast minimum for its small bold text.
 */
const SOLUTION_STATUS_BADGE_CLASSES: Record<SolutionStatus, string> = {
  [SolutionStatus.Done]: "bg-green-700 text-white",
  [SolutionStatus.TimeLimitExceeded]: "bg-yellow-500 text-black",
  [SolutionStatus.MemoryLimitExceeded]: "bg-yellow-500 text-black",
  [SolutionStatus.Failed]: "bg-red-700 text-white",
  [SolutionStatus.FailedConstraints]: "bg-orange-700 text-white",
};

/**
 * Renders a solution's outcome as a solid, color-coded badge.
 *
 * @param status The solution's outcome.
 * @returns The badge element, labelled with the status in words.
 */
export function SolutionStatusBadge({ status }: SolutionStatusBadgeProps) {
  return (
    <Badge className={`font-bold ${SOLUTION_STATUS_BADGE_CLASSES[status]}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
