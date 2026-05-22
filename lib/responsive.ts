/**
 * Responsive breakpoint constants. Mirrors Tailwind's default breakpoints
 * so we can use the same values in JS-side media queries.
 *
 * No "use client" — this file is plain constants and is safe in server code.
 * The matching hook lives in `hooks/use-media-query.ts`.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Convenience builders so callers don't have to hand-roll query strings.
 *   minWidth("md") -> "(min-width: 768px)"
 */
export function minWidth(bp: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

export function maxWidth(bp: Breakpoint): string {
  return `(max-width: ${BREAKPOINTS[bp] - 1}px)`;
}
