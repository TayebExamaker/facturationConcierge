import {
  fetchAllDocuments,
  handler,
  isUnpaid,
  json,
  preflight,
  summarize,
  toApiInvoice,
} from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Everything not marked paid, oldest first (most urgent on top). */
export const GET = handler(async () => {
  const unpaid = (await fetchAllDocuments())
    .filter(isUnpaid)
    .sort((a, b) => a.date.localeCompare(b.date) || a.invoice_number - b.invoice_number);
  const today = new Date();
  return json({
    totals: summarize(unpaid).map((r) => ({
      currency: r.currency,
      unpaid: r.unpaid,
      overdue: r.overdue,
      unpaid_count: r.unpaid_count,
      overdue_count: r.overdue_count,
    })),
    data: unpaid.map((inv) => toApiInvoice(inv, today)),
  });
});
