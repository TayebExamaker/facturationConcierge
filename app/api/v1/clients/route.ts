import { clientKey, deriveClients } from "@/lib/clients";
import { fetchAllDocuments, handler, json, preflight, summarize } from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export const GET = handler(async (req) => {
  const search = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const docs = await fetchAllDocuments();
  const clients = deriveClients(docs).filter((c) => !search || c.key.includes(search));
  return json({
    data: clients.map((c) => ({
      key: c.key,
      name: c.name,
      address: c.address,
      main_currency: c.currency,
      invoice_count: c.invoiceCount,
      first_invoice_date: c.firstDate,
      last_invoice_date: c.lastDate,
      totals: summarize(docs.filter((d) => clientKey(d.client_name) === c.key)),
    })),
  });
});
