"use client";

import ClientOnly from "@/components/client-only";
import { InvoiceForm } from "@/components/invoice/invoice-form";

const Skeleton = (
  <div className="mx-auto max-w-4xl space-y-4">
    {[96, 160, 140, 200].map((h, i) => (
      <div key={i} className="luxury-card animate-pulse" style={{ height: h }} />
    ))}
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

export default function InvoiceFormIsland({
  prefill,
  defaultPaymentInstructions,
}: {
  prefill?: Prefill;
  defaultPaymentInstructions?: string;
}) {
  const defaults = toDefaults(prefill);
  return (
    <ClientOnly fallback={Skeleton}>
      <InvoiceForm
        defaultValues={defaults as never}
        defaultPaymentInstructions={defaultPaymentInstructions}
      />
    </ClientOnly>
  );
}
