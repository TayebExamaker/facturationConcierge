"use client";

import ClientOnly from "@/components/client-only";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import type { Invoice } from "@/lib/supabase/types";

const filterSkeleton = (
  <div className="luxury-card h-32 animate-pulse bg-muted/10" />
);

const tableSkeleton = (
  <div className="luxury-card overflow-hidden">
    <div className="h-12 border-b border-border bg-muted/30" />
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-14 border-b border-border last:border-b-0 bg-muted/10"
      />
    ))}
  </div>
);

export function FilterBarIsland() {
  return (
    <ClientOnly fallback={filterSkeleton}>
      <FilterBar />
    </ClientOnly>
  );
}

export function InvoiceTableIsland(props: { invoices: Invoice[] }) {
  return (
    <ClientOnly fallback={tableSkeleton}>
      <InvoiceTable invoices={props.invoices} />
    </ClientOnly>
  );
}
