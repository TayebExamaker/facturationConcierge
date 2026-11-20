"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadInvoicePdf } from "@/lib/supabase/storage";
import { parseInvoicePdf } from "@/lib/pdf/parse";
import { invoicesToCsv } from "@/lib/csv/export";
import { formatInvoiceLabel } from "@/lib/format";
import { COMPANY_KEY } from "@/lib/company";
import { CREDIT_LINE_PREFIX, isCreditNote } from "@/lib/credit-note";
import { getPaymentInstructions } from "./settings";
import type {
  Invoice,
  InvoiceFilters,
  InvoiceInput,
  InvoiceItem,
  InvoiceStatus,
} from "@/lib/supabase/types";

const DEFAULT_START_NUMBER = 2737;

/**
 * List invoices, optionally filtered.
 */
export async function listInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  const supabase = createClient();
  let q = supabase
    .from("invoices")
    .select("*")
    .eq("company", COMPANY_KEY)
    .order("date", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.currency) q = q.eq("currency", filters.currency.toUpperCase());
  if (filters?.clientName) q = q.ilike("client_name", `%${filters.clientName}%`);
  if (filters?.dateFrom) q = q.gte("date", filters.dateFrom);
  if (filters?.dateTo) q = q.lte("date", filters.dateTo);

  const { data, error } = await q;
  if (error) throw new Error(`Failed to list invoices: ${error.message}`);
  return withPaymentInstructions((data ?? []) as Invoice[]);
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
    .eq("company", COMPANY_KEY)
    .maybeSingle();
  if (error) throw new Error(`Failed to load invoice: ${error.message}`);
  const row = (data as Invoice | null) ?? null;
  if (!row) return null;
  return (await withPaymentInstructions([row]))[0];
}

/**
 * Create a new invoice. Derives `label` if not provided.
 */
export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const supabase = createClient();
  const row = prepareRow(input);
  row.payment_instructions = await unlinkIfGlobal(
    row.payment_instructions as string | null
  );

  const { data, error } = await supabase
    .from("invoices")
    // Supabase-js generic inference is brittle when Database has an
    // empty schema — cast to bypass; runtime shape is correct.
    .insert(row as never)
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

  // Only store payment instructions when they actually differ from the global
  // block, so the invoice keeps following /settings unless deliberately edited.
  if (input.payment_instructions !== undefined) {
    patch.payment_instructions = await unlinkIfGlobal(input.payment_instructions);
  }

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
    .update(patch as never)
    .eq("id", id)
    .eq("company", COMPANY_KEY)
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
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("company", COMPANY_KEY);
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
    .update({ status } as never)
    .eq("id", id)
    .eq("company", COMPANY_KEY)
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
  const rows = data as Array<{ invoice_number: number }> | null;
  const top = rows?.[0]?.invoice_number;
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

  // Prefer the parsed line items. When the table couldn't be read, fall back to
  // a single line carrying the grand total so nothing is silently lost.
  const parsedItems = parsed.items ?? [];
  const itemsSubtotal = parsedItems.reduce((sum, it) => sum + (it.amount || 0), 0);
  const total = parsedItems.length ? itemsSubtotal : parsed.total ?? 0;

  if (parsedItems.length) {
    warnings.push(
      `Parsed ${parsedItems.length} line item${parsedItems.length === 1 ? "" : "s"} from the PDF.`,
    );
    if (parsed.total !== undefined && Math.abs(parsed.total - itemsSubtotal) > 0.01) {
      warnings.push(
        `Line items total (${itemsSubtotal}) differs from the PDF total (${parsed.total}); please double-check.`,
      );
    }
  }

  const items: InvoiceItem[] = parsedItems.length
    ? parsedItems
    : total
      ? [
          {
            description: "Imported invoice",
            quantity: 1,
            unit_price: total,
            amount: total,
          },
        ]
      : [];

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
    client_address: parsed.clientAddress?.trim() || null,
    date,
    currency,
    items,
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
  items?: InvoiceItem[];
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
    items: parsed.items && parsed.items.length ? parsed.items : undefined,
    warnings: parsed.warnings,
  };
}

// ---------- credit notes ----------

export interface CreditNoteOptions {
  /** Amount to credit. Defaults to the full invoice total. */
  amount?: number;
  /** ISO date; defaults to today. */
  date?: string;
  /** Refund details printed on the credit note (bank, transfer ref…). */
  refundDetails?: string | null;
  notes?: string | null;
}

/**
 * Issue a credit note against an invoice. It takes the next number of the
 * shared sequence, copies the client, and — for a full credit — the invoice
 * lines, so the accountant can match it line for line. A partial credit gets
 * a single line. Amounts are stored positive (see lib/credit-note.ts).
 */
export async function createCreditNote(
  invoiceId: string,
  opts: CreditNoteOptions = {}
): Promise<Invoice> {
  const original = await getInvoice(invoiceId);
  if (!original) throw new Error("Invoice not found");
  if (isCreditNote(original)) {
    throw new Error("A credit note cannot itself be credited.");
  }

  const fullTotal = round2(Number(original.total));
  const amount = round2(opts.amount ?? fullTotal);
  if (!(amount > 0)) throw new Error("Credit amount must be greater than zero.");
  if (amount > fullTotal + 0.005) {
    throw new Error(
      `Credit amount (${amount}) exceeds the invoice total (${fullTotal}).`
    );
  }

  const isFull = Math.abs(amount - fullTotal) < 0.005;
  const items: InvoiceItem[] =
    isFull && (original.items ?? []).length
      ? original.items.map((it) => ({
          ...it,
          description: `${CREDIT_LINE_PREFIX}${it.description}`,
        }))
      : [
          {
            description: `${isFull ? "Cancellation & refund" : "Partial refund"} - invoice #${original.invoice_number}`,
            quantity: 1,
            unit_price: amount,
            amount,
          },
        ];
  // A full credit mirrors the original's discount/tax/shipping so its totals
  // block matches the invoice; a partial one is a single flat line.
  const carryAdjustments = isFull;

  return createInvoice({
    invoice_number: await getNextInvoiceNumber(),
    client_name: original.client_name,
    client_address: original.client_address,
    date: opts.date || new Date().toISOString().slice(0, 10),
    payment_terms: null,
    payment_instructions: opts.refundDetails?.trim() || null,
    po_number: original.po_number,
    currency: original.currency,
    items,
    subtotal: carryAdjustments ? round2(Number(original.subtotal)) : amount,
    tax_rate: carryAdjustments ? Number(original.tax_rate) : 0,
    tax_amount: carryAdjustments ? round2(Number(original.tax_amount)) : 0,
    discount: carryAdjustments ? round2(Number(original.discount)) : 0,
    shipping: carryAdjustments ? round2(Number(original.shipping)) : 0,
    total: amount,
    to_be_paid: amount,
    notes: opts.notes?.trim() || null,
    status: "draft",
    source: "created",
    document_type: "credit_note",
    credited_invoice_id: original.id,
    credited_invoice_number: original.invoice_number,
  });
}

/**
 * Credit notes issued against an invoice (newest first). Returns [] on a DB
 * that predates the credit-note columns instead of failing the invoice page.
 */
export async function listCreditNotesFor(invoiceId: string): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("company", COMPANY_KEY)
    .eq("credited_invoice_id", invoiceId)
    .order("invoice_number", { ascending: false });
  if (error) return [];
  return (data ?? []) as Invoice[];
}

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

// ---------- helpers ----------

/**
 * Fill in `payment_instructions` from the global block (app_settings) for every
 * row that has none. A null column means "follow the global block", so editing
 * it in /settings updates previews, PDFs and CSV exports for all invoices at
 * once. The settings row is fetched once per call, and only when needed.
 */
async function withPaymentInstructions(rows: Invoice[]): Promise<Invoice[]> {
  // Credit notes never inherit our bank details: their block holds the refund
  // details (where the money went), and stays empty when there are none.
  const needsFallback = rows.some(
    (r) => !isCreditNote(r) && !r.payment_instructions?.trim()
  );
  if (!needsFallback) return rows;
  const globalBlock = await getPaymentInstructions();
  return rows.map((r) =>
    isCreditNote(r) || r.payment_instructions?.trim()
      ? r
      : { ...r, payment_instructions: globalBlock }
  );
}

/**
 * Collapse a payment block that is identical to the global one back to null so
 * the invoice stays linked to /settings. Anything else is kept verbatim as a
 * per-invoice override.
 */
async function unlinkIfGlobal(
  value: string | null | undefined
): Promise<string | null> {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const globalBlock = await getPaymentInstructions();
  return trimmed === globalBlock.trim() ? null : trimmed;
}

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
    payment_instructions: input.payment_instructions ?? null,
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
    company: COMPANY_KEY,
    // Only sent for credit notes, so plain invoices still insert on a DB that
    // hasn't run 0006_credit_notes.sql yet (the column defaults to 'invoice').
    ...(input.document_type === "credit_note"
      ? {
          document_type: "credit_note",
          credited_invoice_id: input.credited_invoice_id ?? null,
          credited_invoice_number: input.credited_invoice_number ?? null,
        }
      : {}),
  };
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /unique/i.test(error.message ?? "");
}

export type { InvoiceFilters };
