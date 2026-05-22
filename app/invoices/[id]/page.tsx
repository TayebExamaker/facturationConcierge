import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { StatusPill } from "@/components/invoice/status-pill";
import { formatInvoiceLabel } from "@/lib/format";
import { getInvoice } from "@/app/actions/invoices";
import {
  InvoiceActionsIsland,
  InvoiceFormIsland,
  InvoicePreviewIsland,
} from "./_invoice-island";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { edit?: string };
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: PageProps) {
  let invoice: Awaited<ReturnType<typeof getInvoice>> | null = null;
  try {
    invoice = await getInvoice(params.id);
  } catch {
    invoice = null;
  }

  if (!invoice) {
    notFound();
  }

  const inv = invoice;
  const isEditing = searchParams?.edit === "1";

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 no-print">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <p className="text-xs uppercase tracking-[0.25em] text-gold">
              Invoice
            </p>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-serif text-4xl sm:text-5xl">
                {formatInvoiceLabel(inv.invoice_number, inv.client_name)}
              </h1>
              <StatusPill status={inv.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {inv.client_name ?? "—"}
            </p>
          </div>
          <InvoiceActionsIsland invoice={inv} />
        </div>

        <div className="gold-divider no-print" aria-hidden="true" />

        {isEditing ? (
          <>
            <div className="flex justify-end no-print">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/invoices/${params.id}`}>Back to view</Link>
              </Button>
            </div>
            <InvoiceFormIsland invoiceId={params.id} defaultValues={invoice} />
          </>
        ) : (
          <>
            <div className="flex justify-end no-print">
              <Button asChild variant="outline" size="sm">
                <Link href={`/invoices/${params.id}?edit=1`}>Edit invoice</Link>
              </Button>
            </div>
            <InvoicePreviewIsland invoice={invoice} />
          </>
        )}
      </div>
    </PageShell>
  );
}
