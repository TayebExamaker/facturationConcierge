"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";

import { EASE_OUT } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned on desktop, full-width row under the title on phones. */
  actions?: React.ReactNode;
  /** Inline content next to the title (e.g. a status pill). */
  badge?: React.ReactNode;
  back?: { href: string; label: string };
  /** Put actions beside the title only from xl (for wide action blocks). */
  wideActions?: boolean;
  className?: string;
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** iOS-style large title block shared by every page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  back,
  wideActions = false,
  className,
}: PageHeaderProps) {
  return (
    <motion.header
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className={cn(
        "no-print mb-6 flex flex-col gap-5 sm:mb-8",
        wideActions
          ? "xl:flex-row xl:items-end xl:justify-between"
          : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {back ? (
          <motion.div variants={item}>
            <Link
              href={back.href}
              className="group -ml-1.5 mb-3 inline-flex h-8 items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {back.label}
            </Link>
          </motion.div>
        ) : null}
        {eyebrow ? (
          <motion.p variants={item} className="eyebrow">
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.div variants={item} className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-[clamp(1.6rem,7vw,1.875rem)] font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {badge}
        </motion.div>
        {description ? (
          <motion.p
            variants={item}
            className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
      </div>
      {actions ? (
        <motion.div variants={item} className="shrink-0">
          {actions}
        </motion.div>
      ) : null}
    </motion.header>
  );
}

/** Inline error banner for failed server loads. */
export function LoadError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export default PageHeader;
