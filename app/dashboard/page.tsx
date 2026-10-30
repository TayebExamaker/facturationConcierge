import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { LoadError, PageHeader } from "@/components/layout/page-header";
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
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Outstanding balances, recent activity and every invoice in one place."
        actions={
          <div className="hidden gap-2 md:flex">
            <Button asChild variant="outline">
              <Link href="/invoices/import">
                <Upload />
                Import PDF
              </Link>
            </Button>
            <Button asChild variant="gold">
              <Link href="/invoices/new">
                <Plus />
                New Invoice
              </Link>
            </Button>
          </div>
        }
      />

      {loadError ? <LoadError message={loadError} /> : null}

      <div className="flex flex-col gap-8">
        <KpiCards invoices={invoices} />
        <DashboardIsland invoices={invoices} />
      </div>
    </PageShell>
  );
}
