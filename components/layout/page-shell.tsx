"use client";

import * as React from "react";
import { motion } from "motion/react";

import { EASE_OUT } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Use the full content width instead of the centred container. */
  full?: boolean;
}

/**
 * Content frame for every routed page. Navigation chrome lives in
 * `AppChrome` (root layout); this only handles width, spacing and the
 * page-enter transition (re-runs on each navigation since `app/template.tsx`
 * re-mounts the route subtree).
 */
export function PageShell({ children, className, full = false }: PageShellProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "w-full flex-1 pb-6 pt-3 sm:pt-8 lg:pb-14 lg:pt-10",
        full ? "px-4 sm:px-6 lg:px-10" : "container max-w-6xl",
        className,
      )}
    >
      {children}
    </motion.main>
  );
}

export default PageShell;
