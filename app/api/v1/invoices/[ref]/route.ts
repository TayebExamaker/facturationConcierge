import { COMPANY_KEY } from "@/lib/company";
import { apiError, db, handler, json, preflight, toApiInvoice } from "@/lib/api/core";
import type { Invoice } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `ref` is either the row UUID or the invoice number (e.g. 3398). */
export const GET = handler(async (_req, { params }) => {
  const ref = decodeURIComponent(params.ref ?? "").trim();
  let q = db().from("invoices").select("*").eq("company", COMPANY_KEY);
  if (UUID.test(ref)) q = q.eq("id", ref);
  else if (/^\d+$/.test(ref)) q = q.eq("invoice_number", Number(ref));
  else return apiError(400, "bad_request", "Use an invoice UUID or invoice number.");

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return apiError(404, "not_found", `No invoice ${ref}.`);
  return json({ data: toApiInvoice(data as Invoice) });
});
