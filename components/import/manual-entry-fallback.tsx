"use client";

import * as React from "react";
import { createInvoice } from "@/app/actions/invoices";
import {
  defaultInvoiceFormValues,
  invoiceFormSchema,
  computeTotals,
  type InvoiceFormValues,
} from "@/lib/validation/invoice";
import { toAppError, errorToToast } from "@/lib/errors";
import { parseMoneyInput } from "@/lib/format";

type ManualEntryFallbackProps = {
  /** Original uploaded filename, e.g. "InvoiceJaneDoe.pdf". Used as client-name hint. */
  filename: string;
  /** Next available invoice number, supplied by the server before render. */
  nextInvoiceNumber: number;
  /** Optional hint of fields the parser DID manage to extract. */
  partial?: Partial<
    Pick<InvoiceFormValues, "client_name" | "date" | "currency" | "invoice_number">
  >;
  /** Called when the user discards the import. */
  onDiscard?: () => void;
  /** Called after a successful save with the new invoice id. */
  onSaved?: (invoiceId: string) => void;
};

/**
 * Manual-entry fallback shown after a failed PDF auto-parse.
 *
 * Pre-fills:
 *   - client_name: cleaned filename hint (stem of `.pdf`)
 *   - date: today (via defaults)
 *   - items: one empty row (via defaults)
 *   - currency: "USD"
 *   - notes: "Imported from PDF (auto-parse failed)"
 *
 * The form is intentionally minimal — this is an emergency lane, not a
 * replacement for the full invoice editor. Users can save here to get the
 * invoice in their list, then refine in the regular editor.
 */
export function ManualEntryFallback(
  props: ManualEntryFallbackProps
): React.ReactElement {
  const { filename, nextInvoiceNumber, partial, onDiscard, onSaved } = props;

  const initial = React.useMemo<InvoiceFormValues>(() => {
    const base = defaultInvoiceFormValues(nextInvoiceNumber);
    return {
      ...base,
      client_name:
        partial?.client_name ?? stripPdfExtension(filename) ?? base.client_name,
      date: partial?.date ?? base.date,
      currency: (partial?.currency ?? base.currency).toUpperCase(),
      invoice_number: partial?.invoice_number ?? base.invoice_number,
      notes: "Imported from PDF (auto-parse failed)",
    };
  }, [filename, nextInvoiceNumber, partial]);

  const [values, setValues] = React.useState<InvoiceFormValues>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<{ title: string; description: string } | null>(
    null
  );

  React.useEffect(() => {
    setValues(initial);
  }, [initial]);

  const set = <K extends keyof InvoiceFormValues>(
    key: K,
    value: InvoiceFormValues[K]
  ): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const setItem = (
    idx: number,
    patch: Partial<InvoiceFormValues["items"][number]>
  ): void => {
    setValues((prev) => {
      const items = prev.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        const qty = Number(next.quantity) || 0;
        const price = Number(next.unit_price) || 0;
        next.amount = round2(qty * price);
        return next;
      });
      return { ...prev, items };
    });
  };

  const addItem = (): void => {
    setValues((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: "", quantity: 1, unit_price: 0, amount: 0 },
      ],
    }));
  };

  const removeItem = (idx: number): void => {
    setValues((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== idx) : prev.items,
    }));
  };

  const totals = React.useMemo(
    () =>
      computeTotals({
        items: values.items,
        tax_rate: values.tax_rate,
        discount: values.discount,
        shipping: values.shipping,
      }),
    [values.items, values.tax_rate, values.discount, values.shipping]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const merged: InvoiceFormValues = {
        ...values,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total: totals.total,
        to_be_paid: totals.total,
      };

      const parsed = invoiceFormSchema.safeParse(merged);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setError({
          title: "Check the form",
          description: first?.message ?? "Some fields are invalid.",
        });
        return;
      }

      // BACK's createInvoice accepts an `InvoiceInput`. The schema-validated
      // shape is structurally compatible; cast through unknown to bridge the
      // two type sources without coupling QA to BACK's internal type.
      const input = {
        ...parsed.data,
        source: "imported" as const,
      } as unknown as Parameters<typeof createInvoice>[0];

      const created = await createInvoice(input);
      onSaved?.((created as { id: string }).id);
    } catch (err) {
      const appErr = toAppError(err);
      setError(errorToToast(appErr));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        role="alert"
        className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
      >
        We couldn&apos;t auto-extract details from this PDF. Fill in the values below.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Invoice #" htmlFor="invoice_number">
            <input
              id="invoice_number"
              type="number"
              min={1}
              step={1}
              value={values.invoice_number}
              onChange={(e) =>
                set("invoice_number", Number(e.target.value) as InvoiceFormValues["invoice_number"])
              }
              className={inputClass}
              required
            />
          </Field>

          <Field label="Date" htmlFor="date">
            <input
              id="date"
              type="date"
              value={values.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Client name" htmlFor="client_name">
            <input
              id="client_name"
              type="text"
              value={values.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              className={inputClass}
              required
              maxLength={200}
            />
          </Field>

          <Field label="Currency" htmlFor="currency">
            <input
              id="currency"
              type="text"
              value={values.currency}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
              className={inputClass}
              maxLength={6}
            />
          </Field>

          <Field label="Client address" htmlFor="client_address" className="md:col-span-2">
            <textarea
              id="client_address"
              value={values.client_address ?? ""}
              onChange={(e) => set("client_address", e.target.value)}
              className={textareaClass}
              rows={2}
              maxLength={500}
            />
          </Field>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-zinc-200">Line items</legend>
          {values.items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-start rounded-md border border-zinc-800 p-3"
            >
              <div className="col-span-12 md:col-span-6">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => setItem(idx, { description: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) =>
                    setItem(idx, { quantity: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Unit price"
                  defaultValue={String(item.unit_price)}
                  onBlur={(e) =>
                    setItem(idx, { unit_price: parseMoneyInput(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-3 md:col-span-1 text-sm text-zinc-300 self-center">
                {item.amount.toFixed(2)}
              </div>
              <div className="col-span-1 md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove line item"
                  className="text-zinc-400 hover:text-amber-400 px-2"
                  disabled={values.items.length <= 1}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            + Add line item
          </button>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tax rate (%)" htmlFor="tax_rate">
            <input
              id="tax_rate"
              type="number"
              min={0}
              step="any"
              value={values.tax_rate}
              onChange={(e) => set("tax_rate", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Discount" htmlFor="discount">
            <input
              id="discount"
              type="text"
              inputMode="decimal"
              defaultValue={String(values.discount)}
              onBlur={(e) => set("discount", parseMoneyInput(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Shipping" htmlFor="shipping">
            <input
              id="shipping"
              type="text"
              inputMode="decimal"
              defaultValue={String(values.shipping)}
              onBlur={(e) => set("shipping", parseMoneyInput(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-200">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax</span>
            <span>{totals.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 font-semibold text-amber-300">
            <span>Total</span>
            <span>
              {totals.total.toFixed(2)} {values.currency}
            </span>
          </div>
        </div>

        <Field label="Notes" htmlFor="notes">
          <textarea
            id="notes"
            value={values.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            className={textareaClass}
            rows={2}
            maxLength={2000}
          />
        </Field>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            <strong className="font-medium">{error.title}.</strong> {error.description}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100"
            disabled={submitting}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving…" : "Save invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ManualEntryFallback;

/* ---------- small internal helpers ---------- */

function stripPdfExtension(filename: string): string {
  if (!filename) return "";
  return filename.replace(/\.pdf$/i, "").trim();
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const inputClass =
  "w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60";

const textareaClass = inputClass + " resize-y";

function Field(props: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={props.className}>
      <label
        htmlFor={props.htmlFor}
        className="block text-xs font-medium text-zinc-300 mb-1"
      >
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
