import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill } from "@/components/invoice/status-pill";
import { formatDate, formatMoney } from "@/lib/format";
import { getInvoice } from "@/app/actions/invoices";
import { getPaymentInstructions } from "@/app/actions/settings";
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
  const paymentInstructions = isEditing ? await getPaymentInstructions() : undefined;

  if (isEditing) {
    return (
      <PageShell>
        <PageHeader
          className="mx-auto max-w-4xl"
          back={{ href: `/invoices/${params.id}`, label: "Back to invoice" }}
          eyebrow="Editing"
          title={`Invoice #${inv.invoice_number}`}
          description={inv.client_name ?? undefined}
        />
        <InvoiceFormIsland
          invoiceId={params.id}
          defaultValues={invoice}
          defaultPaymentInstructions={paymentInstructions}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        wideActions
        eyebrow={`Invoice #${inv.invoice_number} · ${formatDate(inv.date)}`}
        title={inv.client_name ?? "—"}
        badge={<StatusPill status={inv.status} />}
        description={
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatMoney(Number(inv.total ?? 0), inv.currency ?? "USD")}
          </span>
        }
        actions={<InvoiceActionsIsland invoice={inv} />}
      />
      <InvoicePreviewIsland invoice={invoice} />
    </PageShell>
  );
}
