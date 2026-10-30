"use client";

import * as React from "react";
import { motion, type HTMLMotionProps, type Variants } from "motion/react";

/**
 * Shared motion vocabulary. Every animated surface in the app pulls its
 * timing from here so the whole product moves with one "feel":
 * quick, springy, never bouncy. `MotionConfig reducedMotion="user"` (set in
 * AppChrome) turns transforms off for users who ask for less motion.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING_PRESS = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 } as const;
export const SPRING_LAYOUT = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } as const;
export const SPRING_PANEL = { type: "spring", stiffness: 420, damping: 40, mass: 0.5 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  /** Vertical offset (px) the element rises from. */
  y?: number;
}

export function FadeIn({ delay = 0, y = 14, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Seconds between each child. */
  step?: number;
  delay?: number;
}

/** Parent that reveals its `StaggerItem` children one after another. */
export function Stagger({ step = 0.05, delay = 0, children, ...props }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  );
}

/** Initials for avatar bubbles ("Onyx Carriage Ltd" → "OC"). */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? words[1]?.[0] ?? "" : words[0]?.[1] ?? "";
  return (first + second).toUpperCase();
}

export function Avatar({
  name,
  className,
  size = 40,
}: {
  name: string | null | undefined;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 font-semibold tracking-wide text-slate-700 ring-1 ring-inset ring-slate-900/[0.06] " +
        (className ?? "")
      }
    >
      {initials(name)}
    </span>
  );
}

export default FadeIn;
