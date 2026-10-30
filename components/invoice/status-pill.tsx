import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/supabase/types";

export interface StatusPillProps
  extends Omit<BadgeProps, "variant" | "children"> {
  status: InvoiceStatus | string | null | undefined;
}

/** Soft semantic tones: tinted fill + matching dot. */
export const STATUS_TONE: Record<InvoiceStatus, { pill: string; dot: string }> = {
  draft: { pill: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-400" },
  sent: { pill: "border-sky-200/80 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  paid: { pill: "border-emerald-200/80 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  overdue: { pill: "border-rose-200/80 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

function toneFor(status: string | null | undefined) {
  const s = (status ?? "draft").toLowerCase() as InvoiceStatus;
  return STATUS_TONE[s] ?? STATUS_TONE.draft;
}

function labelFor(status: string | null | undefined): string {
  const s = (status ?? "draft").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const tone = toneFor(status);
  return (
    <Badge
      variant="outline"
      className={cn("font-medium normal-case tracking-normal text-xs", tone.pill, className)}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden="true" />
      {labelFor(status)}
    </Badge>
  );
}

export default StatusPill;
