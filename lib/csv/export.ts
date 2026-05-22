import Papa from "papaparse";
import type { Invoice } from "@/lib/supabase/types";

/**
 * Convert a list of invoices to a CSV string.
 *
 * Columns: Invoice #, Label, Client, Date, Description, Amount, Currency, Tax, Total, Status.
 * Description joins each item's `description` with " | ".
 * Amount is the subtotal (pre-tax, pre-discount, pre-shipping).
 */
export function invoicesToCsv(rows: Invoice[]): string {
  const data = rows.map((inv) => ({
    "Invoice #": inv.invoice_number,
    Label: inv.label,
    Client: inv.client_name,
    Date: inv.date,
    Description: (inv.items ?? [])
      .map((i) => i.description ?? "")
      .filter((d) => d.length > 0)
      .join(" | "),
    Amount: inv.subtotal,
    Currency: inv.currency,
    Tax: inv.tax_amount,
    Total: inv.total,
    Status: inv.status,
  }));

  return Papa.unparse(data, {
    columns: [
      "Invoice #",
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
