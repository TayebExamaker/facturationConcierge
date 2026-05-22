import { PageShell } from "@/components/layout/page-shell";
import InvoiceFormIsland from "./_form-island";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { prefill?: string };
}

type PrefillPayload = {
  client_name?: string;
  client_address?: string;
  date?: string;
  total?: number;
  currency?: string;
};

/**
 * Decode the `?prefill=...` param produced by the share-target route. The
 * payload is base64url-encoded JSON so it survives the OS share sheet round
 * trip without an intermediate storage layer.
 */
function decodePrefill(raw: string | undefined): PrefillPayload | undefined {
  if (!raw) return undefined;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as PrefillPayload;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export default function NewInvoicePage({ searchParams }: PageProps) {
  const prefill = decodePrefill(searchParams?.prefill);

  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">
          Concierge One
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-1">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Compose a new invoice. Totals are computed automatically as you edit.
        </p>
      </div>
      <div className="gold-divider mb-6" aria-hidden="true" />

      <InvoiceFormIsland prefill={prefill} />
    </PageShell>
  );
}
