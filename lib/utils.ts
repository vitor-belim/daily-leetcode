import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class values through clsx and resolves conflicting Tailwind
 * classes with tailwind-merge.
 *
 * @param inputs Class values (strings, arrays, conditional objects).
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
