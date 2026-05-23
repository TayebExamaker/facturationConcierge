import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DashboardIsland } from "./_dashboard-island";
import { listInvoices } from "@/app/actions/invoices";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let loadError: string | null = null;
  try {
    invoices = await listInvoices();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load invoices";
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold">
              Concierge One
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl mt-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-prose">
              Manage invoices, monitor outstanding balances, and import new
              invoices from PDF.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button asChild variant="outline" className="h-11 sm:h-9">
              <Link href="/invoices/import">
                <Upload className="h-4 w-4" />
                Import PDF
              </Link>
            </Button>
            <Button asChild variant="gold" className="h-11 sm:h-9">
              <Link href="/invoices/new">
                <Plus className="h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          </div>
        </div>

        <div className="gold-divider" aria-hidden="true" />

        {loadError ? (
          <div className="luxury-card p-4 border-destructive/40 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <KpiCards invoices={invoices} />
        <DashboardIsland invoices={invoices} />
      </div>
    </PageShell>
  );
}
