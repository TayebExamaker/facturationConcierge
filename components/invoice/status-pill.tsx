import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/supabase/types";

export interface StatusPillProps
  extends Omit<BadgeProps, "variant" | "children"> {
  status: InvoiceStatus | string | null | undefined;
}

function variantFor(status: string | null | undefined): BadgeProps["variant"] {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "gold";
    case "sent":
      return "secondary";
    case "overdue":
      return "destructive";
    case "draft":
      return "outline";
    case "void":
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
}

function labelFor(status: string | null | undefined): string {
  const s = (status ?? "draft").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  return (
    <Badge
      variant={variantFor(status)}
      className={cn("font-medium", className)}
      {...props}
    >
      {labelFor(status)}
    </Badge>
  );
}

export default StatusPill;
