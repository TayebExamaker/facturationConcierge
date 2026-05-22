"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadInvoicePdf } from "@/lib/supabase/storage";
import { parseInvoicePdf } from "@/lib/pdf/parse";
import { invoicesToCsv } from "@/lib/csv/export";
import { formatInvoiceLabel } from "@/lib/format";
import type {
  Invoice,
  InvoiceFilters,
  InvoiceInput,
  InvoiceStatus,
} from "@/lib/supabase/types";

const DEFAULT_START_NUMBER = 1000;

/**
 * List invoices, optionally filtered.
 */
export async function listInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  const supabase = createClient();
  let q = supabase.from("invoices").select("*").order("date", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.currency) q = q.eq("currency", filters.currency.toUpperCase());
  if (filters?.clientName) q = q.ilike("client_name", `%${filters.clientName}%`);
  if (filters?.dateFrom) q = q.gte("date", filters.dateFrom);
  if (filters?.dateTo) q = q.lte("date", filters.dateTo);

  const { data, error } = await q;
  if (error) throw new Error(`Failed to list invoices: ${error.message}`);
  return (data ?? []) as Invoice[];
}

/**
 * Fetch a single invoice by id.
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load invoice: ${error.message}`);
  return (data as Invoice | null) ?? null;
}

/**
 * Create a new invoice. Derives `label` if not provided.
 */
export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const supabase = createClient();
  const row = prepareRow(input);

  const { data, error } = await supabase
    .from("invoices")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        `Invoice number ${input.invoice_number} already exists. Pick a different number.`
      );
    }
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return data as Invoice;
}

/**
 * Update an existing invoice.
 */
export async function updateInvoice(
  id: string,
  input: Partial<InvoiceInput>
): Promise<Invoice> {
  const supabase = createClient();
  const patch: Record<string, unknown> = { ...input };

  // Recompute label if client or number changed.
  if (input.client_name !== undefined || input.invoice_number !== undefined) {
    const existing = await getInvoice(id);
    if (!existing) throw new Error("Invoice not found");
    const num = input.invoice_number ?? existing.invoice_number;
    const name = input.client_name ?? existing.client_name;
    patch.label = formatInvoiceLabel(num, name);
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        `Invoice number ${input.invoice_number} already exists. Pick a different number.`
      );
    }
    throw new Error(`Failed to update invoice: ${error.message}`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return data as Invoice;
}

/**
 * Delete an invoice by id.
 */
export async function deleteInvoice(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
  revalidatePath("/invoices");
}

/**
 * Set invoice status.
 */
export async function setInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<Invoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to set status: ${error.message}`);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return data as Invoice;
}

/**
 * Compute the next invoice number: max(invoice_number)+1, or DEFAULT_START_NUMBER when empty.
 */
export async function getNextInvoiceNumber(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("invoice_number", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to compute next invoice number: ${error.message}`);
  const top = data?.[0]?.invoice_number;
  if (typeof top !== "number") return DEFAULT_START_NUMBER;
  return top + 1;
}

/**
 * Check whether an invoice_number is already used (optionally excluding an id).
 */
export async function checkInvoiceNumberExists(
  n: number,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient();
  let q = supabase.from("invoices").select("id").eq("invoice_number", n).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to check invoice number: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Import an invoice from a PDF file.
 * - Parses fields via lib/pdf/parse.
 * - Uploads the original PDF to the invoice-pdfs bucket.
 * - Creates a new invoice row with source='imported'.
 * - Returns the new invoice + any parser warnings.
 */
export async function importInvoiceFromPdf(
  formData: FormData
): Promise<{ invoice: Invoice; warnings: string[] }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No file provided");
  }
  if (file.size === 0) throw new Error("Uploaded file is empty");

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseInvoicePdf(buf);
  const warnings = [...parsed.warnings];

  // Resolve invoice number — use parsed if free, otherwise auto-increment.
  let invoiceNumber = parsed.invoiceNumber ?? (await getNextInvoiceNumber());
  if (parsed.invoiceNumber !== undefined) {
    const exists = await checkInvoiceNumberExists(parsed.invoiceNumber);
    if (exists) {
      const next = await getNextInvoiceNumber();
      warnings.push(
        `Invoice number ${parsed.invoiceNumber} already exists; assigned ${next} instead.`
      );
      invoiceNumber = next;
    }
  }

  const clientName = parsed.clientName?.trim() || "Unknown Client";
  if (!parsed.clientName) {
    warnings.push("Client name could not be parsed; please edit before sending.");
  }
  const date = parsed.date || new Date().toISOString().slice(0, 10);
  if (!parsed.date) {
    warnings.push(`Date not detected; defaulted to today (${date}).`);
  }
  const currency = (parsed.currency || "USD").toUpperCase();
  const total = parsed.total ?? 0;

  // Upload original PDF to storage.
  let pdfUrl: string | null = null;
  try {
    const uploaded = await uploadInvoicePdf(buf, file.name, {
      contentType: file.type || "application/pdf",
    });
    pdfUrl = uploaded.publicUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`PDF stored locally only — upload failed: ${msg}`);
  }

  const input: InvoiceInput = {
    invoice_number: invoiceNumber,
    client_name: clientName,
    date,
    currency,
    items: total
      ? [
          {
            description: "Imported invoice",
            quantity: 1,
            unit_price: total,
            amount: total,
          },
        ]
      : [],
    subtotal: total,
    tax_rate: 0,
    tax_amount: 0,
    discount: 0,
    shipping: 0,
    total,
    to_be_paid: total,
    notes: null,
    status: "draft",
    source: "imported",
    pdf_url: pdfUrl,
  };

  const invoice = await createInvoice(input);
  return { invoice, warnings };
}

/**
 * Export invoices to a CSV string.
 */
export async function exportInvoicesCsv(filters?: InvoiceFilters): Promise<string> {
  const rows = await listInvoices(filters);
  return invoicesToCsv(rows);
}

/**
 * Parse a PDF without persisting anything. Returns extracted fields + warnings
 * so the UI can present a review form before the user commits via `createInvoice`.
 */
export type ParsedPdfPreview = {
  invoice_number?: number;
  client_name?: string;
  client_address?: string;
  date?: string;
  total?: number;
  currency?: string;
  warnings: string[];
};

export async function parseInvoicePdfOnly(
  formData: FormData
): Promise<ParsedPdfPreview> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  if (file.size === 0) throw new Error("Uploaded file is empty");

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseInvoicePdf(buf);

  return {
    invoice_number: parsed.invoiceNumber,
    client_name: parsed.clientName?.trim() || undefined,
    client_address: parsed.clientAddress?.trim() || undefined,
    date: parsed.date || undefined,
    total: parsed.total,
    currency: parsed.currency?.toUpperCase() || undefined,
    warnings: parsed.warnings,
  };
}

// ---------- helpers ----------

function prepareRow(input: InvoiceInput): Record<string, unknown> {
  const label =
    input.label && input.label.trim().length > 0
      ? input.label
      : formatInvoiceLabel(input.invoice_number, input.client_name);
  return {
    invoice_number: input.invoice_number,
    label,
    client_name: input.client_name,
    client_address: input.client_address ?? null,
    date: input.date,
    payment_terms: input.payment_terms ?? null,
    po_number: input.po_number ?? null,
    currency: (input.currency || "USD").toUpperCase(),
    items: input.items ?? [],
    subtotal: input.subtotal,
    tax_rate: input.tax_rate,
    tax_amount: input.tax_amount,
    discount: input.discount,
    shipping: input.shipping,
    total: input.total,
    to_be_paid: input.to_be_paid,
    notes: input.notes ?? null,
    status: input.status ?? "draft",
    source: input.source ?? "created",
    pdf_url: input.pdf_url ?? null,
  };
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /unique/i.test(error.message ?? "");
}

export type { InvoiceFilters };
