import { clientKey, getClientProfile } from "@/lib/clients";
import {
  apiError,
  fetchAllDocuments,
  handler,
  json,
  preflight,
  summarize,
  toApiInvoice,
} from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** `key` = client name (case/space-insensitive), URL-encoded. */
export const GET = handler(async (_req, { params }) => {
  const key = clientKey(decodeURIComponent(params.key ?? ""));
  const profile = getClientProfile(await fetchAllDocuments(), key);
  if (!profile) return apiError(404, "not_found", "Unknown client.");
  const today = new Date();
  const s = profile.summary;
  return json({
    data: {
      key: s.key,
      name: s.name,
      address: s.address,
      main_currency: s.currency,
      invoice_count: s.invoiceCount,
      first_invoice_date: s.firstDate,
      last_invoice_date: s.lastDate,
      totals: summarize(profile.invoices),
      invoices: profile.invoices.map((inv) => toApiInvoice(inv, today)),
    },
  });
});
