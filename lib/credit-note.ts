// Credit-note helpers shared by server actions, PDF, preview and dashboard.
// A credit note is a row of public.invoices with document_type='credit_note'
// (see supabase/migrations/0006_credit_notes.sql). Its amounts are stored
// positive; anything that aggregates money must use `signedTotal`.

import type { DocumentType } from "@/lib/supabase/types";

type HasDocType = { document_type?: DocumentType | null };

export function isCreditNote(doc: HasDocType | null | undefined): boolean {
  return doc?.document_type === "credit_note";
}

/** "Invoice" / "Credit note" — for eyebrows, titles, toasts. */
export function documentNoun(doc: HasDocType | null | undefined): string {
  return isCreditNote(doc) ? "Credit note" : "Invoice";
}

/** Total with the sign it has in the books: credit notes count negative. */
export function signedTotal(doc: HasDocType & { total?: number | null }): number {
  const t = Number(doc.total ?? 0);
  const n = Number.isFinite(t) ? t : 0;
  return isCreditNote(doc) ? -n : n;
}

/** Description prefix put on lines copied from the credited invoice. */
export const CREDIT_LINE_PREFIX = "Cancellation & refund\n";
