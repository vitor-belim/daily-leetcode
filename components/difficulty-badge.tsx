import { Badge } from "@/components/ui/badge";
import { Difficulty } from "@/lib/types";
import type { ComponentProps } from "react";

interface DifficultyStyle {
  variant: ComponentProps<typeof Badge>["variant"];
  className: string;
}

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

const DIFFICULTY_STYLES: Record<Difficulty, DifficultyStyle> = {
  [Difficulty.Easy]: {
    variant: "secondary",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  [Difficulty.Medium]: {
    variant: "default",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  [Difficulty.Hard]: { variant: "destructive", className: "" },
};

/**
 * Renders a problem's difficulty as a color-coded badge.
 *
 * @param difficulty The problem's difficulty tier.
 * @returns The badge element.
 */
export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { variant, className } = DIFFICULTY_STYLES[difficulty];

  return (
    <Badge variant={variant} className={className}>
      {difficulty}
    </Badge>
  );
}
