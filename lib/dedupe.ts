/**
 * Duplicate-detection helpers used by the import flow.
 *
 * A parsed import is considered a duplicate when an existing invoice
 * matches BOTH the invoice number AND the client name (case-insensitive,
 * whitespace-collapsed). Number-only collisions are not treated as
 * duplicates because the user may have manually renumbered.
 */

export type ExistingInvoiceRef = {
  id: string;
  invoice_number: number;
  client_name: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  existing?: ExistingInvoiceRef;
};

export type ParsedInvoiceHint = {
  invoiceNumber?: number;
  clientName?: string;
};

function normalizeName(s: string | undefined | null): string {
  if (!s) return "";
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkDuplicateOnImport(
  parsed: ParsedInvoiceHint,
  allInvoices: ExistingInvoiceRef[]
): DuplicateCheckResult {
  if (!parsed || !Array.isArray(allInvoices) || allInvoices.length === 0) {
    return { isDuplicate: false };
  }

  const parsedNumber =
    typeof parsed.invoiceNumber === "number" &&
    Number.isFinite(parsed.invoiceNumber)
      ? parsed.invoiceNumber
      : null;
  const parsedName = normalizeName(parsed.clientName);

  if (parsedNumber === null || !parsedName) {
    return { isDuplicate: false };
  }

  const hit = allInvoices.find(
    (inv) =>
      inv.invoice_number === parsedNumber &&
      normalizeName(inv.client_name) === parsedName
  );

  if (hit) {
    return { isDuplicate: true, existing: hit };
  }
  return { isDuplicate: false };
}
