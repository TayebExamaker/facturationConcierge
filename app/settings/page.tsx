import { PageShell } from "@/components/layout/page-shell";
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
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">
          Concierge One
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-1">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Bank details are stored once here and used by every invoice — preview,
          PDF and CSV. Change them below and every invoice, past and future,
          follows automatically.
        </p>
      </div>
      <div className="gold-divider mb-6" aria-hidden="true" />

      {loadError ? (
        <div className="luxury-card p-4 border-destructive/40 text-sm text-destructive mb-4">
          {loadError}
        </div>
      ) : null}

      <PaymentDetailsIsland initialValue={current} />
    </PageShell>
  );
}
