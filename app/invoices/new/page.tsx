import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getPaymentInstructions } from "@/app/actions/settings";
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

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const prefill = decodePrefill(searchParams?.prefill);
  const paymentInstructions = await getPaymentInstructions();

  return (
    <PageShell>
      <PageHeader
        className="mx-auto max-w-4xl"
        eyebrow="Create"
        title="New Invoice"
        description="Totals are computed automatically as you type."
      />

      <InvoiceFormIsland
        prefill={prefill}
        defaultPaymentInstructions={paymentInstructions}
      />
    </PageShell>
  );
}
