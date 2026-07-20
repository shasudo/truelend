import { twMerge } from "tailwind-merge";

/**
 * Combines conditional classes and makes the last conflicting Tailwind class
 * authoritative. Shared primitives rely on this contract so callers can
 * intentionally override defaults such as width, background, and min-height.
 */
export const cx = (...classes: (string | false | null | undefined)[]) => twMerge(...classes);
