import { z } from "zod";

/**
 * Zod schemas for invoice forms.
 *
 * Currency accepts 3-6 char codes so we can mix ISO 4217 (3) with crypto tokens
 * (BTC/USDT/USDC/SOL — 3-4 chars). Length range is intentionally relaxed
 * vs strict ISO 3-letter spec.
 */

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  // `amount` is derived (qty * unit_price); not user-editable, computed in persist().
  amount: z.coerce.number().min(0).optional().default(0),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  invoice_number: z.coerce
    .number()
    .int()
    .positive("Invoice # must be a positive integer"),
  client_name: z.string().min(1, "Client name is required").max(200),
  client_address: z.string().max(500).optional().or(z.literal("")),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  payment_terms: z.string().max(100).optional().or(z.literal("")),
  payment_instructions: z.string().max(10000).optional().or(z.literal("")),
  po_number: z.string().max(100).optional().or(z.literal("")),
  currency: z
    .string()
    .min(3, "Currency code must be 3-6 characters")
    .max(6, "Currency code must be 3-6 characters")
    .default("USD"),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
  // Derived totals — computed in InvoiceForm.persist() before hitting BACK.
  // Kept optional so the user-facing form doesn't fail validation on fields
  // they never see.
  subtotal: z.coerce.number().min(0).optional().default(0),
  tax_rate: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0),
  shipping: z.coerce.number().min(0),
  total: z.coerce.number().min(0).optional().default(0),
  to_be_paid: z.coerce.number().min(0).optional().default(0),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

/**
 * Today's date as YYYY-MM-DD in local time. We avoid `toISOString` so users
 * near midnight UTC don't see "tomorrow" in their invoices.
 */
function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultInvoiceFormValues(
  nextNumber: number
): InvoiceFormValues {
  return {
    invoice_number: nextNumber,
    client_name: "",
    client_address: "",
    date: todayLocalISO(),
    payment_terms: "",
    payment_instructions: "",
    po_number: "",
    currency: "USD",
    items: [
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    discount: 0,
    shipping: 0,
    total: 0,
    to_be_paid: 0,
    notes: "",
    status: "draft",
  };
}

/**
 * Pure totals calculator. FRONT calls this from `totals-summary.tsx`.
 * - subtotal: sum of line `amount`s (each line.amount should already be qty*unit_price,
 *   but we recompute from qty*unit_price defensively).
 * - tax_amount: (subtotal - discount) * (tax_rate / 100), clamped to >= 0.
 * - total: subtotal - discount + tax_amount + shipping, clamped to >= 0.
 */
export function computeTotals(
  values: Pick<InvoiceFormValues, "items" | "tax_rate" | "discount" | "shipping">
): { subtotal: number; tax_amount: number; total: number } {
  const subtotal = values.items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const line = qty * price;
    return acc + (isFinite(line) ? line : 0);
  }, 0);

  const discount = Number(values.discount) || 0;
  const shipping = Number(values.shipping) || 0;
  const taxRate = Number(values.tax_rate) || 0;

  const taxable = Math.max(0, subtotal - discount);
  const tax_amount = taxable * (taxRate / 100);
  const total = Math.max(0, subtotal - discount + tax_amount + shipping);

  return {
    subtotal: round2(subtotal),
    tax_amount: round2(tax_amount),
    total: round2(total),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
