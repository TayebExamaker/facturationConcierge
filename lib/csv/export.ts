import Papa from "papaparse";
import { isCreditNote, signedTotal } from "@/lib/credit-note";
import type { Invoice } from "@/lib/supabase/types";

/**
 * Convert a list of invoices to a CSV string.
 *
 * Columns: Invoice #, Label, Client, Date, Description, Amount, Currency, Tax, Total, Status.
 * Description joins each item's `description` with " | ".
 * Amount is the subtotal (pre-tax, pre-discount, pre-shipping).
 * Credit notes are flagged in "Type" and their money columns are negative so
 * a plain SUM over the export nets them out.
 */
export function invoicesToCsv(rows: Invoice[]): string {
  const data = rows.map((inv) => {
    const sign = isCreditNote(inv) ? -1 : 1;
    return {
      "Invoice #": inv.invoice_number,
      Type: isCreditNote(inv)
        ? `Credit note${inv.credited_invoice_number ? ` (invoice #${inv.credited_invoice_number})` : ""}`
        : "Invoice",
      Label: inv.label,
      Client: inv.client_name,
      Date: inv.date,
      Description: (inv.items ?? [])
        .map((i) => i.description ?? "")
        .filter((d) => d.length > 0)
        .join(" | "),
      Amount: sign * Number(inv.subtotal),
      Currency: inv.currency,
      Tax: sign * Number(inv.tax_amount),
      Total: signedTotal(inv),
      Status:
        isCreditNote(inv) && inv.status === "paid" ? "refunded" : inv.status,
    };
  });

  return Papa.unparse(data, {
    columns: [
      "Invoice #",
      "Type",
      "Label",
      "Client",
      "Date",
      "Description",
      "Amount",
      "Currency",
      "Tax",
      "Total",
      "Status",
    ],
    quotes: true,
    newline: "\r\n",
  });
}
