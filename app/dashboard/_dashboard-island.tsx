"use client";

import * as React from "react";

import ClientOnly from "@/components/client-only";
import { FilterBar, type FilterValues } from "@/components/dashboard/filter-bar";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/types";

const STATUS_VALUES: readonly InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

function applyFilters(invoices: Invoice[], f: FilterValues, ignoreStatus = false): Invoice[] {
  const client = f.client.trim().toLowerCase();
  const from = f.from || null;
  const to = f.to || null;
  const statusActive =
    !ignoreStatus &&
    f.status !== "all" &&
    (STATUS_VALUES as readonly string[]).includes(f.status);
  const currencyActive = f.currency !== "all";

  return invoices.filter((inv) => {
    if (statusActive && inv.status !== f.status) return false;
    if (currencyActive && inv.currency !== f.currency) return false;
    if (client && !(inv.client_name ?? "").toLowerCase().includes(client)) return false;
    if (from && inv.date < from) return false;
    if (to && inv.date > to) return false;
    return true;
  });
}

const islandSkeleton = (
  <div className="space-y-4">
    <div className="h-11 animate-pulse rounded-xl bg-secondary" />
    <div className="flex gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-secondary" />
      ))}
    </div>
    <div className="luxury-card overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/60 p-4 last:border-b-0">
          <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function DashboardIsland({ invoices }: { invoices: Invoice[] }) {
  return (
    <ClientOnly fallback={islandSkeleton}>
      <DashboardInner invoices={invoices} />
    </ClientOnly>
  );
}

function DashboardInner({ invoices }: { invoices: Invoice[] }) {
  const [filters, setFilters] = React.useState<FilterValues>({
    status: "all",
    currency: "all",
    client: "",
    from: "",
    to: "",
  });

  const filtered = React.useMemo(
    () => applyFilters(invoices, filters),
    [invoices, filters],
  );

  // Chip counts reflect every other active filter, so they always match what
  // tapping the chip would show.
  const counts = React.useMemo(() => {
    const base = applyFilters(invoices, filters, true);
    const c: Record<string, number> = { all: base.length };
    for (const s of STATUS_VALUES) c[s] = base.filter((i) => i.status === s).length;
    return c;
  }, [invoices, filters]);

  const currencies = React.useMemo(
    () => Array.from(new Set(invoices.map((i) => i.currency).filter(Boolean))).sort(),
    [invoices],
  );

  return (
    <section className="space-y-4" aria-label="Invoices">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Invoices</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} of {invoices.length}
        </span>
      </div>
      <FilterBar
        value={filters}
        onChange={setFilters}
        counts={counts}
        currencies={currencies}
      />
      <InvoiceTable invoices={filtered} />
    </section>
  );
}
