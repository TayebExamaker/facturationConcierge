import { z } from "zod";

/**
 * Zod schemas for invoice forms.
 *
 * Currency accepts 3-6 char codes so we can mix ISO 4217 (3) with crypto tokens
 * (BTC/USDT/USDC/SOL — 3-4 chars). Length range is intentionally relaxed
 * vs strict ISO 3-letter spec.
 */

/**
 * Comma-tolerant decimal coercion.
 *
 * The numeric form inputs are `type="text"` and store the RAW string the user
 * typed (see line-items.tsx — no `valueAsNumber`/`setValueAs`). FR/EU keyboards
 * on both desktop and mobile emit "," as the decimal separator, so a value like
 * "1,5" reaches the resolver as the string "1,5". Plain `z.coerce.number()` does
 * `Number("1,5")` -> NaN, which fails `.min(0)` and SILENTLY blocks submission —
 * the user types a comma and the "Save" button does nothing.
 *
 * We normalise here (mirrors `parseMoneyInput` / `toNumberLoose`): strip
 * currency symbols & spaces, resolve which of "." / "," is the decimal
 * separator, and hand a real number to the inner schema. Empty -> 0.
 */
function normalizeDecimal(v: unknown): unknown {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (s === "") return 0;

  let cleaned = s.replace(/[^\d.,\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",")
    return 0;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    // Both separators present — the rightmost is the decimal point, the other
    // is a thousands grouping ("1.234,56" or "1,234.56").
    if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    else cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    cleaned = cleaned.replace(",", ".");
  }

  const n = Number(cleaned);
  // Hand the original back on failure so the inner schema raises its message.
  return Number.isFinite(n) ? n : v;
}

/** Wrap a numeric schema so it accepts comma decimals and stray symbols. */
const decimal = (schema: z.ZodNumber) => z.preprocess(normalizeDecimal, schema);

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: decimal(z.number().min(0)),
  unit_price: decimal(z.number().min(0)),
  // `amount` is derived (qty * unit_price); not user-editable, computed in persist().
  amount: decimal(z.number().min(0)),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  invoice_number: decimal(
    z.number().int().positive("Invoice # must be a positive integer"),
  ),
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
  // Kept lenient so the user-facing form doesn't fail validation on fields
  // they never see; comma decimals are normalised before coercion.
  subtotal: decimal(z.number().min(0)),
  tax_rate: decimal(z.number().min(0)),
  tax_amount: decimal(z.number().min(0)),
  discount: decimal(z.number().min(0)),
  shipping: decimal(z.number().min(0)),
  total: decimal(z.number().min(0)),
  to_be_paid: decimal(z.number().min(0)),
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
