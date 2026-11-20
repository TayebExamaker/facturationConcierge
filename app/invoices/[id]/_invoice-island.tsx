"use client";

import ClientOnly from "@/components/client-only";
import { CreditNotePanel } from "@/components/invoice/credit-note-panel";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { InvoiceForm } from "@/components/invoice/invoice-form";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import type { DocumentType, Invoice } from "@/lib/supabase/types";

const formSkeleton = (
  <div className="luxury-card animate-pulse p-8">
    <div className="h-6 w-48 rounded-lg bg-secondary" />
    <div className="mt-4 h-32 rounded-xl bg-secondary/60" />
  </div>
);

const actionsSkeleton = (
  <div className="flex flex-col gap-3 xl:items-end">
    <div className="h-12 w-full animate-pulse rounded-2xl bg-secondary md:w-[26rem]" />
    <div className="h-16 w-full animate-pulse rounded-2xl bg-secondary md:h-10 md:w-80" />
  </div>
);

const previewSkeleton = (
  <div className="luxury-card animate-pulse p-8">
    <div className="h-8 w-64 rounded-lg bg-secondary" />
    <div className="mt-6 h-40 rounded-xl bg-secondary/60" />
  </div>
);

export function InvoiceActionsIsland(props: { invoice: Invoice }) {
  return (
    <ClientOnly fallback={actionsSkeleton}>
      <InvoiceActions invoice={props.invoice} />
    </ClientOnly>
  );
}

export function InvoiceFormIsland(props: {
  invoiceId: string;
  defaultValues: unknown;
  defaultPaymentInstructions?: string;
  documentType?: DocumentType;
  creditedInvoiceNumber?: number | null;
}) {
  return (
    <ClientOnly fallback={formSkeleton}>
      <InvoiceForm
        invoiceId={props.invoiceId}
        defaultValues={props.defaultValues as never}
        defaultPaymentInstructions={props.defaultPaymentInstructions}
        documentType={props.documentType}
        creditedInvoiceNumber={props.creditedInvoiceNumber}
      />
    </ClientOnly>
  );
}

export function InvoicePreviewIsland(props: { invoice: unknown }) {
  return (
    <ClientOnly fallback={previewSkeleton}>
      <InvoicePreview invoice={props.invoice as never} />
    </ClientOnly>
  );
}

export function CreditNotePanelIsland(props: { invoice: Invoice; creditNotes: Invoice[] }) {
  return (
    <ClientOnly fallback={null}>
      <CreditNotePanel invoice={props.invoice} creditNotes={props.creditNotes} />
    </ClientOnly>
  );
}
