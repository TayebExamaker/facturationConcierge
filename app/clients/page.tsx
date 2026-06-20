import { PageShell } from "@/components/layout/page-shell";
import { ClientsIsland } from "./_clients-island";
import { listClients } from "@/app/actions/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let loadError: string | null = null;
  try {
    clients = await listClients();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load clients";
  }

  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">
          Concierge One
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-1">Clients</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Every client you have invoiced, with their billing history. Open a
          client to see all their invoices or start a new one with their details
          pre-filled.
        </p>
      </div>
      <div className="gold-divider mb-6" aria-hidden="true" />

      {loadError ? (
        <div className="luxury-card p-4 border-destructive/40 text-sm text-destructive mb-4">
          {loadError}
        </div>
      ) : null}

      <ClientsIsland clients={clients} />
    </PageShell>
  );
}
