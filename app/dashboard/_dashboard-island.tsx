"use client";

import * as React from "react";

import ClientOnly from "@/components/client-only";
import { FilterBar, type FilterValues } from "@/components/dashboard/filter-bar";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/types";

const STATUS_VALUES: readonly InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

function applyFilters(invoices: Invoice[], f: FilterValues): Invoice[] {
  const client = f.client.trim().toLowerCase();
  const from = f.from || null;
  const to = f.to || null;
  const statusActive =
    f.status !== "all" && (STATUS_VALUES as readonly string[]).includes(f.status);
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
  <div className="space-y-6">
    <div className="luxury-card h-32 animate-pulse bg-muted/10" />
    <div className="luxury-card overflow-hidden">
      <div className="h-12 border-b border-border bg-muted/30" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 border-b border-border last:border-b-0 bg-muted/10"
        />
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

  return (
    <div className="space-y-6">
      <FilterBar value={filters} onChange={setFilters} />
      <InvoiceTable invoices={filtered} />
    </div>
  );
}
