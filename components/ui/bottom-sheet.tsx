"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";

import { SPRING_PANEL } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * Draggable bottom sheet (adapted from 21st.dev "BeUI Bottom Sheet").
 * Height follows its content up to 92dvh. Drag the handle/header down, fling,
 * tap the backdrop or press Escape to dismiss. Used for mobile action sheets
 * and filter panels — anything that would be a popover on desktop.
 */
export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 550;

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();

  React.useEffect(() => setMounted(true), []);

  // Lock background scroll + Escape to close while open.
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      onOpenChange(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 no-print">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING_PANEL}
            className={cn(
              "absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-border/70 bg-card shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.35)] will-change-transform",
              className,
            )}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex cursor-grab touch-none flex-col items-center px-5 pb-2 pt-3 active:cursor-grabbing"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
              {title || description ? (
                <div className="mt-3 w-full">
                  {title ? (
                    <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                      {title}
                    </h2>
                  ) : null}
                  {description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+var(--safe-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Large tappable row for action sheets. */
export function SheetAction({
  icon,
  label,
  hint,
  destructive,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  hint?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/70 disabled:opacity-50",
        destructive && "text-destructive",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
          destructive ? "bg-destructive/10" : "bg-secondary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </motion.button>
  );
}

export default BottomSheet;
