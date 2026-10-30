import { PageShell } from "@/components/layout/page-shell";
import { LoadError, PageHeader } from "@/components/layout/page-header";
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
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        description="Everyone you have invoiced, with their billing history. Open a client to see their invoices or start a new one pre-filled."
      />

      {loadError ? <LoadError message={loadError} /> : null}

      <ClientsIsland clients={clients} />
    </PageShell>
  );
}
