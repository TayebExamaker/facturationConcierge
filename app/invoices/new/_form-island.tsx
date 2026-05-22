"use client";

import ClientOnly from "@/components/client-only";
import { InvoiceForm } from "@/components/invoice/invoice-form";

const Skeleton = (
  <div className="luxury-card p-8 animate-pulse">
    <div className="h-6 w-48 rounded bg-muted/60" />
    <div className="mt-4 h-4 w-72 rounded bg-muted/40" />
    <div className="mt-10 h-32 rounded-md bg-muted/30" />
    <div className="mt-4 h-32 rounded-md bg-muted/30" />
  </div>
);

interface Prefill {
  client_name?: string;
  client_address?: string;
  date?: string;
  total?: number;
  currency?: string;
}

function toDefaults(p: Prefill | undefined) {
  if (!p) return undefined;
  const total = typeof p.total === "number" && p.total > 0 ? p.total : 0;
  return {
    client_name: p.client_name ?? "",
    client_address: p.client_address ?? "",
    date: p.date ?? "",
    currency: (p.currency ?? "USD").toUpperCase(),
    ...(total > 0 && {
      items: [
        {
          description: "Imported from PDF",
          quantity: 1,
          unit_price: total,
          amount: total,
        },
      ],
      to_be_paid: total,
    }),
  };
}

export default function InvoiceFormIsland({ prefill }: { prefill?: Prefill }) {
  const defaults = toDefaults(prefill);
  return (
    <ClientOnly fallback={Skeleton}>
      <InvoiceForm defaultValues={defaults as never} />
    </ClientOnly>
  );
}
