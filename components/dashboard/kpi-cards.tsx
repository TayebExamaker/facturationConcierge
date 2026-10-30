"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CircleCheck, Receipt } from "lucide-react";

import { NumberTicker } from "@/components/motion/number-ticker";
import { FitText } from "@/components/ui/fit-text";
import { EASE_OUT, Stagger, StaggerItem } from "@/components/motion/primitives";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/supabase/types";

export interface KpiCardsProps {
  invoices: Invoice[];
  /**
   * Display currency for aggregated KPIs. Defaults to USD; when invoices
   * contain mixed currencies a small "mixed currencies" hint is rendered.
   */
  displayCurrency?: string;
  className?: string;
}

function sumWhere(invoices: Invoice[], predicate: (i: Invoice) => boolean) {
  return invoices.reduce((acc, inv) => {
    if (!predicate(inv)) return acc;
    const total = Number((inv as { total?: number }).total ?? 0);
    return acc + (Number.isFinite(total) ? total : 0);
  }, 0);
}

export function KpiCards({
  invoices,
  displayCurrency = "USD",
  className,
}: KpiCardsProps) {
  const currencies = new Set(
    invoices
      .map((i) => (i as { currency?: string }).currency)
      .filter((c): c is string => typeof c === "string" && c.length > 0),
  );
  const mixed = currencies.size > 1;

  const totalInvoiced = sumWhere(invoices, () => true);
  const totalPaid = sumWhere(invoices, (i) => i.status === "paid");
  const totalOutstanding = sumWhere(
    invoices,
    (i) => i.status === "sent" || i.status === "overdue" || i.status === "draft",
  );
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const openCount = invoices.length - paidCount;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const collected = totalInvoiced > 0 ? Math.min(1, totalPaid / totalInvoiced) : 0;

  const money = (n: number) => formatMoney(n, displayCurrency);

  return (
    <Stagger
      step={0.07}
      className={cn("grid grid-cols-2 gap-3 sm:gap-4", className)}
    >
      {/* Hero — outstanding balance on ink. */}
      <StaggerItem className="ink-card col-span-2 p-5 sm:p-7 lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="flex min-w-0 items-start justify-between gap-4 lg:block lg:flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              Outstanding
            </p>
            <FitText
              text={money(totalOutstanding)}
              className="mt-2 text-[2.25rem] font-semibold leading-[1.1] tracking-tight tabular-nums sm:text-[2.75rem]"
            >
              <NumberTicker value={totalOutstanding} format={money} />
            </FitText>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 ring-1 ring-inset ring-white/15 lg:mt-4 lg:inline-block">
            {openCount} open
          </span>
        </div>

        <div className="mt-6 lg:mt-0 lg:w-80 lg:shrink-0">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Collected</span>
            <span className="tabular-nums text-white/80">
              {Math.round(collected * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${collected * 100}%` }}
              transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.25 }}
              className="h-full rounded-full bg-white"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
            <span>{invoices.length} invoices</span>
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                {overdueCount} overdue
              </span>
            ) : null}
            {mixed ? (
              <span title="Totals shown in display currency; invoices include multiple currencies">
                Mixed currencies
              </span>
            ) : null}
          </div>
        </div>
      </StaggerItem>

      <StatCard
        label="Paid"
        icon={<CircleCheck />}
        value={totalPaid}
        format={money}
        hint={`${paidCount} invoice${paidCount === 1 ? "" : "s"}`}
        tone="positive"
      />
      <StatCard
        label="Invoiced"
        icon={<Receipt />}
        value={totalInvoiced}
        format={money}
        hint="All time"
      />
    </Stagger>
  );
}

function StatCard({
  label,
  icon,
  value,
  format,
  hint,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  format: (n: number) => string;
  hint: string;
  tone?: "positive";
}) {
  return (
    <StaggerItem
      whileHover={{ y: -2 }}
      className="luxury-card flex min-w-0 flex-col justify-between p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl [&_svg]:h-4 [&_svg]:w-4",
            tone === "positive" ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 min-w-0">
        <FitText
          text={format(value)}
          className="text-xl font-semibold leading-tight tracking-tight tabular-nums lg:text-2xl"
        >
          <NumberTicker value={value} format={format} />
        </FitText>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </StaggerItem>
  );
}

export default KpiCards;
