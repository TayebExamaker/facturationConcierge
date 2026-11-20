import { fetchAllDocuments, handler, json, preflight, summarize } from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export const GET = handler(async () => {
  const docs = await fetchAllDocuments();
  return json({
    generated_at: new Date().toISOString(),
    note: "Amounts are per currency and never mixed. Credit notes count negative. Unpaid = every document not marked paid (same rule as the dashboard), net of amounts already received.",
    by_currency: summarize(docs),
  });
});
