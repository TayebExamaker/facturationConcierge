import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { COMPANY, PAYMENT_BLOCK } from "@/lib/company";
import { formatMoney, formatDate, formatInvoiceLabel } from "@/lib/format";
import { isCreditNote } from "@/lib/credit-note";
import type { Invoice } from "@/lib/supabase/types";

// Brand palette — light theme, black accents (matches the on-screen preview).
const COLORS = {
  navy: "#0F172A",      // table header / dark band (kept name for stability)
  navyDeep: "#0F172A",
  gold: "#0F172A",      // accent — repurposed to ink-black
  goldLight: "#F1F5F9", // light tint
  ink: "#0F172A",
  body: "#334155",      // slate-700
  muted: "#64748B",     // slate-500
  rule: "#E2E8F0",      // slate-200
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
};

// Use Helvetica (built-in) for body and Times-Roman (built-in) for serif headings.
// These ship with @react-pdf/renderer so no Font.register needed.
// Suppress emoji warnings:
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.surface,
    color: COLORS.body,
    fontFamily: "Helvetica",
    fontSize: 10,
    // Page-level padding applies to every page including overflow pages,
    // so continuation content (payment details on p.2+) keeps a top margin.
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 40,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 16,
    objectFit: "cover",
  },
  brandName: {
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 0.6,
  },
  brandSub: {
    color: COLORS.muted,
    fontFamily: "Helvetica",
    fontSize: 9,
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  invoiceTitle: {
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    letterSpacing: 1,
  },
  invoiceMeta: {
    color: COLORS.ink,
    fontSize: 11,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: COLORS.rule,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  goldRule: { height: 1, backgroundColor: COLORS.rule, marginTop: 8 },

  body: {
    paddingTop: 12,
  },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  block: { flex: 1 },
  blockRight: { flex: 1, alignItems: "flex-end" },
  label: {
    color: COLORS.muted,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: { color: COLORS.ink, fontSize: 11, lineHeight: 1.5 },
  valueBold: { color: COLORS.ink, fontSize: 11, fontFamily: "Helvetica-Bold" },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 9 },
  metaValue: { color: COLORS.ink, fontSize: 10, fontFamily: "Helvetica-Bold" },

  tableWrap: { marginTop: 8, marginBottom: 8 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  trAlt: { backgroundColor: COLORS.surfaceAlt },
  cell: { color: COLORS.ink, fontSize: 10 },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.4, textAlign: "right" },
  colAmt: { flex: 1.4, textAlign: "right" },

  totals: {
    marginTop: 14,
    marginLeft: "auto",
    width: "45%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { color: COLORS.muted, fontSize: 10 },
  totalValue: { color: COLORS.ink, fontSize: 10 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.ink,
  },
  grandLabel: {
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  grandValue: {
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },

  notes: {
    marginTop: 22,
    padding: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ink,
  },
  notesLabel: {
    color: COLORS.muted,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesBody: { color: COLORS.body, fontSize: 10, lineHeight: 1.5 },

  paymentTitle: {
    marginTop: 22,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  paymentRule: {
    height: 1,
    backgroundColor: COLORS.ink,
    width: 60,
    marginBottom: 10,
  },
  paymentLine: { color: COLORS.body, fontSize: 9.5, lineHeight: 1.55 },
  paymentHeading: {
    color: COLORS.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginTop: 8,
    marginBottom: 2,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    paddingTop: 8,
  },
  footerText: { color: COLORS.muted, fontSize: 8 },
});

// A heading is a short line (<= 55 chars) ending with ":" (optionally "  :"),
// with no other colon in its content. Catches "USD Payment:" as well as the
// longer "EUR SWIFT Payment (For accounts outside of Europe):" without
// hard-coding the keyword "Payment".
function isPaymentHeading(line: string): boolean {
  const m = /^(.{1,55}?)\s*:\s*$/.exec(line.trim());
  return m !== null && m[1].length > 0 && !m[1].includes(":");
}

function PaymentBlock({ text }: { text: string }): React.ReactElement {
  // Render the payment block with section headings styled, one <View> per
  // section. Each section is wrap={false} so a page break can only land
  // *between* sections — otherwise a heading gets orphaned at the bottom of a
  // page with its bank details on the next one.
  const lines = text.split(/\r?\n/);
  const sections: { start: number; lines: string[] }[] = [];
  lines.forEach((line, idx) => {
    const last = sections[sections.length - 1];
    // Start a new section on a heading, but only once the current one holds
    // real content — consecutive headings stay together.
    const startNew =
      last === undefined ||
      (isPaymentHeading(line) && last.lines.some((l) => l.trim() !== "" && !isPaymentHeading(l)));
    if (startNew) sections.push({ start: idx, lines: [line] });
    else last.lines.push(line);
  });

  return (
    <View>
      {sections.map((section) => (
        <View key={section.start} wrap={false}>
          {section.lines.map((line, i) => {
            const key = section.start + i;
            if (isPaymentHeading(line)) {
              return (
                <Text key={key} style={styles.paymentHeading}>
                  {line.trim()}
                </Text>
              );
            }
            if (line.trim() === "") {
              return (
                <Text key={key} style={styles.paymentLine}>
                  {" "}
                </Text>
              );
            }
            return (
              <Text key={key} style={styles.paymentLine}>
                {line}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface DocProps {
  invoice: Invoice;
}

export function InvoicePdfDocument({ invoice }: DocProps): React.ReactElement {
  const label =
    invoice.label ||
    formatInvoiceLabel(invoice.invoice_number, invoice.client_name);
  const credit = isCreditNote(invoice);
  const docTitle = credit ? "CREDIT NOTE" : "INVOICE";
  // A "to be paid" below the total means part of it was already settled.
  // Meaningless on a credit note, which only ever shows what is credited.
  const amountPaid =
    !credit && invoice.to_be_paid != null
      ? Math.round((Number(invoice.total) - Number(invoice.to_be_paid)) * 100) / 100
      : 0;
  // Credit notes carry refund details (or nothing) — never our bank block.
  const paymentText = credit
    ? invoice.payment_instructions?.trim() || ""
    : invoice.payment_instructions?.trim() || PAYMENT_BLOCK;

  return (
    <Document
      title={label}
      author={COMPANY.name}
      subject={`${credit ? "Credit note" : "Invoice"} ${invoice.invoice_number}`}
      creator={COMPANY.name}
      producer={COMPANY.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Brand mark. The src resolves against the browser origin since
                renderInvoicePdfBlob runs client-side. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not HTML img */}
            <Image style={styles.logoMark} src="/brand/logo.jpeg" />
            <View>
              <Text style={styles.brandName}>{COMPANY.name}</Text>
              {COMPANY.addressLines.map((l, i) => (
                <Text key={i} style={styles.brandSub}>
                  {l}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{docTitle}</Text>
            <Text style={styles.invoiceMeta}>#{invoice.invoice_number}</Text>
            <Text style={styles.invoiceMeta}>{formatDate(invoice.date)}</Text>
          </View>
        </View>
        <View style={styles.goldRule} />

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={styles.block}>
              <Text style={styles.label}>{credit ? "Credited To" : "Billed To"}</Text>
              <Text style={styles.valueBold}>{invoice.client_name}</Text>
              {invoice.client_address ? (
                <Text style={styles.value}>{invoice.client_address}</Text>
              ) : null}
            </View>
            <View style={styles.blockRight}>
              <View style={{ minWidth: 180 }}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{credit ? "Credit note #" : "Invoice #"}</Text>
                  <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
                </View>
                {credit && invoice.credited_invoice_number ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Original invoice #</Text>
                    <Text style={styles.metaValue}>{invoice.credited_invoice_number}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaValue}>{formatDate(invoice.date)}</Text>
                </View>
                {invoice.payment_terms ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Terms</Text>
                    <Text style={styles.metaValue}>{invoice.payment_terms}</Text>
                  </View>
                ) : null}
                {invoice.po_number ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>PO #</Text>
                    <Text style={styles.metaValue}>{invoice.po_number}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Currency</Text>
                  <Text style={styles.metaValue}>{invoice.currency}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Line items */}
          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colDesc]}>Description</Text>
              <Text style={[styles.th, styles.colQty]}>Qty</Text>
              <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
              <Text style={[styles.th, styles.colAmt]}>Amount</Text>
            </View>
            {(invoice.items ?? []).map((it, idx) => (
              // wrap={false} keeps a row atomic across a page break. Without it
              // @react-pdf splits the row: the multi-line description flows onto
              // the next page while the single-line qty/price/amount cells stay
              // behind, so the amount ends up on a different page than its line.
              <View
                key={idx}
                wrap={false}
                style={idx % 2 === 1 ? [styles.tr, styles.trAlt] : styles.tr}
              >
                <Text style={[styles.cell, styles.colDesc]}>{it.description}</Text>
                <Text style={[styles.cell, styles.colQty]}>{it.quantity}</Text>
                <Text style={[styles.cell, styles.colPrice]}>
                  {formatMoney(it.unit_price, invoice.currency)}
                </Text>
                <Text style={[styles.cell, styles.colAmt]}>
                  {formatMoney(it.amount, invoice.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals — atomic too, so Subtotal never sits on a page without
              the "To be paid" grand row it belongs to. */}
          <View style={styles.totals} wrap={false}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatMoney(invoice.subtotal, invoice.currency)}
              </Text>
            </View>
            {invoice.discount ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  -{formatMoney(invoice.discount, invoice.currency)}
                </Text>
              </View>
            ) : null}
            {invoice.tax_amount ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax{invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ""}
                </Text>
                <Text style={styles.totalValue}>
                  {formatMoney(invoice.tax_amount, invoice.currency)}
                </Text>
              </View>
            ) : null}
            {invoice.shipping ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(invoice.shipping, invoice.currency)}
                </Text>
              </View>
            ) : null}
            {amountPaid > 0 ? (
              <>
                {/* Total only adds information when tax/discount/shipping
                    made it differ from the subtotal. */}
                {Number(invoice.total) !== Number(invoice.subtotal) ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatMoney(invoice.total, invoice.currency)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Payments received</Text>
                  <Text style={styles.totalValue}>
                    -{formatMoney(amountPaid, invoice.currency)}
                  </Text>
                </View>
              </>
            ) : null}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>{credit ? "Total credited" : "To be paid"}</Text>
              <Text style={styles.grandValue}>
                {formatMoney(
                  credit ? invoice.total : invoice.to_be_paid ?? invoice.total,
                  invoice.currency,
                )}
              </Text>
            </View>
          </View>

          {invoice.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesBody}>{invoice.notes}</Text>
            </View>
          ) : null}

          {/* Payment details (invoice) / refund details (credit note) */}
          {paymentText ? (
            <>
              <Text style={styles.paymentTitle}>
                {credit ? "Refund details" : "Payment details"}
              </Text>
              <View style={styles.paymentRule} />
              <PaymentBlock text={paymentText} />
            </>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBlob(invoice: Invoice): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
}

export function invoicePdfFilename(invoice: Invoice): string {
  const pascal = toPascalCase(invoice.client_name);
  const suffix = isCreditNote(invoice) ? "-CreditNote" : "";
  return `${invoice.invoice_number}-${pascal}${suffix}.pdf`;
}

function toPascalCase(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}
