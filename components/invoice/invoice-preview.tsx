import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { COMPANY, PAYMENT_BLOCK } from "@/lib/company";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface InvoicePreviewLine {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoicePreviewData {
  invoice_number?: number | string | null;
  date?: string | null;
  payment_terms?: string | null;
  payment_instructions?: string | null;
  po_number?: string | null;
  client_name?: string | null;
  client_address?: string | null;
  currency?: string | null;
  items?: InvoicePreviewLine[];
  subtotal?: number | null;
  tax_rate?: number | null;
  discount?: number | null;
  shipping?: number | null;
  total?: number | null;
  to_be_paid?: number | null;
  notes?: string | null;
}

export interface InvoicePreviewProps {
  invoice: InvoicePreviewData;
  className?: string;
}

function computeFallbacks(inv: InvoicePreviewData) {
  const items = inv.items ?? [];
  const subtotal =
    inv.subtotal ??
    items.reduce(
      (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
      0,
    );
  const discount = Number(inv.discount) || 0;
  const shipping = Number(inv.shipping) || 0;
  const taxRate = Number(inv.tax_rate) || 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const taxAmount = taxableBase * (taxRate / 100);
  const total = inv.total ?? taxableBase + taxAmount + shipping;
  const toBePaid = inv.to_be_paid ?? total;
  return { subtotal, taxAmount, total, toBePaid, taxRate, discount, shipping };
}

export function InvoicePreview({ invoice, className }: InvoicePreviewProps) {
  const currency = invoice.currency || "USD";
  const totals = computeFallbacks(invoice);
  const items = invoice.items ?? [];

  return (
    <article
      className={cn(
        "bg-white text-foreground luxury-card overflow-hidden print:shadow-none print:bg-white print:text-black",
        className,
      )}
      aria-label="Invoice preview"
    >
      {/* Top — logo + INVOICE title */}
      <header className="px-5 sm:px-8 pt-6 sm:pt-8 pb-2 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
        <Logo size={72} />
        <div className="text-left sm:text-right w-full sm:w-auto">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
            INVOICE
          </h2>
          <div className="mt-2 inline-flex items-center gap-2 border border-border rounded-md px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">#</span>
            <span className="font-medium tabular-nums">
              {invoice.invoice_number ?? "—"}
            </span>
          </div>
        </div>
      </header>

      {/* From / Meta */}
      <section className="px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold text-foreground">{COMPANY.name}</div>
          {COMPANY.addressLines.map((line) => (
            <div key={line} className="text-muted-foreground text-[13px]">
              {line}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-3 items-center">
          <span className="text-muted-foreground">Date</span>
          <div className="border border-border rounded-md px-3 py-1.5 text-sm">
            {invoice.date ? formatDate(invoice.date) : "—"}
          </div>
          <span className="text-muted-foreground">Payment terms</span>
          <div className="border border-border rounded-md px-3 py-1.5 text-sm">
            {invoice.payment_terms || "—"}
          </div>
          <span className="text-muted-foreground">PO number</span>
          <div className="border border-border rounded-md px-3 py-1.5 text-sm">
            {invoice.po_number || "—"}
          </div>
        </div>
      </section>

      {/* To */}
      <section className="px-5 sm:px-8 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">To</div>
          <div className="border border-border rounded-md px-3 py-2 min-h-[48px]">
            <div className="font-medium">{invoice.client_name || "—"}</div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Delivery address</div>
          <div className="border border-border rounded-md px-3 py-2 min-h-[48px] whitespace-pre-line text-[13px]">
            {invoice.client_address || <span className="text-muted-foreground">(optional)</span>}
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="px-5 sm:px-8 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="text-left py-3 px-3 font-semibold text-sm">
                  Object
                </th>
                <th className="text-right py-3 px-3 font-semibold text-sm w-24">
                  Quantity
                </th>
                <th className="text-right py-3 px-3 font-semibold text-sm w-28">
                  Price
                </th>
                <th className="text-right py-3 px-3 font-semibold text-sm w-32">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground text-sm"
                  >
                    No line items
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const q = Number(item.quantity) || 0;
                  const p = Number(item.unit_price) || 0;
                  const amount = q * p;
                  return (
                    <tr key={idx} className="border-b border-border">
                      <td className="py-3 px-3 align-top whitespace-pre-line">
                        {item.description || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right align-top tabular-nums">
                        {q}
                      </td>
                      <td className="py-3 px-3 text-right align-top tabular-nums">
                        {formatMoney(p, currency)}
                      </td>
                      <td className="py-3 px-3 text-right align-top tabular-nums">
                        {formatMoney(amount, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totals */}
      <section className="px-5 sm:px-8 py-4 flex justify-end">
        <div className="w-full max-w-sm space-y-1.5 text-sm font-mono">
          <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
          {totals.discount ? (
            <TotalRow
              label="Discount"
              value={`- ${formatMoney(totals.discount, currency)}`}
            />
          ) : null}
          {totals.taxRate ? (
            <TotalRow
              label={`Tax (${totals.taxRate}%)`}
              value={formatMoney(totals.taxAmount, currency)}
            />
          ) : null}
          {totals.shipping ? (
            <TotalRow
              label="Shipping"
              value={formatMoney(totals.shipping, currency)}
            />
          ) : null}
          <div className="h-px bg-gold/40 my-2" />
          <TotalRow
            label="Total"
            value={formatMoney(totals.total, currency)}
            emphasis
          />
          {totals.toBePaid !== totals.total ? (
            <TotalRow
              label="To be paid"
              value={formatMoney(totals.toBePaid, currency)}
              gold
            />
          ) : null}
        </div>
      </section>

      {/* Notes */}
      {invoice.notes ? (
        <section className="px-5 sm:px-8 py-4 border-t border-border/40">
          <h3 className="font-serif text-base mb-2">Notes</h3>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {invoice.notes}
          </p>
        </section>
      ) : null}

      {/* Payment block */}
      <section className="px-5 sm:px-8 py-6 border-t border-border/40">
        <h3 className="font-serif text-base mb-3">Payment Information</h3>
        <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words bg-secondary/30 print:bg-transparent rounded-md p-4 text-foreground/90">
{invoice.payment_instructions?.trim() || PAYMENT_BLOCK}
        </pre>
      </section>

      {/* Footer */}
      <footer className="px-8 pb-6 text-xs text-muted-foreground flex justify-between">
        <span className="serif tracking-widest uppercase">
          {COMPANY.name}
        </span>
        <span>Thank you for your business.</span>
      </footer>
    </article>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
  gold,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  gold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        emphasis && "text-base font-semibold",
        gold && "text-gold",
      )}
    >
      <span
        className={cn(
          "uppercase tracking-widest text-xs text-muted-foreground",
          emphasis && "text-foreground text-sm",
          gold && "text-gold",
        )}
      >
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default InvoicePreview;
