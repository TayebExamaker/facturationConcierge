import { PageShell } from "@/components/layout/page-shell";
import { LoadError, PageHeader } from "@/components/layout/page-header";
import { getPaymentInstructions } from "@/app/actions/settings";
import { PAYMENT_BLOCK } from "@/lib/company";
import { PaymentDetailsIsland } from "./_settings-island";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let current = PAYMENT_BLOCK;
  let loadError: string | null = null;
  try {
    current = await getPaymentInstructions();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load settings";
  }

  return (
    <PageShell>
      <PageHeader
        className="mx-auto max-w-3xl"
        eyebrow="Workspace"
        title="Settings"
        description="Bank details are stored once here and used by every invoice — preview, PDF and CSV. Change them and every invoice, past and future, follows."
      />

      <div className="mx-auto max-w-3xl">
        {loadError ? <LoadError message={loadError} /> : null}
        <PaymentDetailsIsland initialValue={current} />
      </div>
    </PageShell>
  );
}
