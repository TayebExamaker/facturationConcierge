"use client";

import ClientOnly from "@/components/client-only";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { InvoiceForm } from "@/components/invoice/invoice-form";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import type { Invoice } from "@/lib/supabase/types";

const formSkeleton = (
  <div className="luxury-card p-8 animate-pulse">
    <div className="h-6 w-48 rounded bg-muted/60" />
    <div className="mt-4 h-32 rounded-md bg-muted/30" />
  </div>
);

const actionsSkeleton = <div className="h-10 w-64 rounded bg-muted/30 animate-pulse" />;

const previewSkeleton = (
  <div className="luxury-card p-8 animate-pulse">
    <div className="h-8 w-64 rounded bg-muted/40" />
    <div className="mt-6 h-40 rounded bg-muted/30" />
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
}) {
  return (
    <ClientOnly fallback={formSkeleton}>
      <InvoiceForm
        invoiceId={props.invoiceId}
        defaultValues={props.defaultValues as never}
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
