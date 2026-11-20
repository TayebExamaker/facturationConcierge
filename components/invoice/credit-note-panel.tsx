"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, ReceiptText, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCreditNote } from "@/app/actions/invoices";
import { isCreditNote } from "@/lib/credit-note";
import { formatDate, formatMoney, parseMoneyInput } from "@/lib/format";
import type { Invoice } from "@/lib/supabase/types";

export interface CreditNotePanelProps {
  invoice: Invoice;
  /** Credit notes already issued against `invoice` (invoices only). */
  creditNotes: Invoice[];
}

/**
 * Invoice page: lists the credit notes issued against it and lets you issue a
 * new one (full or partial). Credit-note page: links back to the original.
 */
export function CreditNotePanel({ invoice, creditNotes }: CreditNotePanelProps) {
  if (isCreditNote(invoice)) {
    if (!invoice.credited_invoice_number) return null;
    const inner = (
      <>
        <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          Credits invoice{" "}
          <span className="font-semibold tabular-nums">#{invoice.credited_invoice_number}</span>
        </span>
        {invoice.credited_invoice_id ? <ArrowUpRight className="h-4 w-4 shrink-0" /> : null}
      </>
    );
    const cls =
      "no-print mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm";
    return invoice.credited_invoice_id ? (
      <Link href={`/invoices/${invoice.credited_invoice_id}`} className={`${cls} hover:border-foreground/20`}>
        {inner}
      </Link>
    ) : (
      <div className={cls}>{inner}</div>
    );
  }

  const credited = creditNotes.reduce((s, cn) => s + Number(cn.total || 0), 0);
  const remaining = Math.max(0, Math.round((Number(invoice.total) - credited) * 100) / 100);

  return (
    <div className="no-print mb-4 space-y-2">
      {creditNotes.map((cn) => (
        <Link
          key={cn.id}
          href={`/invoices/${cn.id}`}
          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm hover:border-foreground/20"
        >
          <Undo2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            Credit note <span className="font-semibold tabular-nums">#{cn.invoice_number}</span>
            <span className="text-muted-foreground"> · {formatDate(cn.date)}</span>
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            -{formatMoney(Number(cn.total), cn.currency)}
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </Link>
      ))}
      {remaining > 0 ? <IssueCreditNote invoice={invoice} maxAmount={remaining} /> : null}
    </div>
  );
}

function IssueCreditNote({ invoice, maxAmount }: { invoice: Invoice; maxAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(maxAmount));
  const [refund, setRefund] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const value = parseMoneyInput(amount);
    if (!(value > 0) || value > maxAmount + 0.005) {
      toast.error(`Amount must be between 0 and ${formatMoney(maxAmount, invoice.currency)}`);
      return;
    }
    try {
      setBusy(true);
      const cn = await createCreditNote(invoice.id, { amount: value, refundDetails: refund });
      toast.success(`Credit note #${cn.invoice_number} created`);
      setOpen(false);
      router.push(`/invoices/${cn.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create credit note");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground active:scale-[0.99]"
      >
        <Undo2 className="h-4 w-4 shrink-0" />
        <span className="flex-1">Issue a credit note (cancellation / refund)</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit note for invoice #{invoice.invoice_number}</DialogTitle>
            <DialogDescription>
              Takes the next number in the sequence and copies {invoice.client_name}&apos;s
              details. You can edit everything afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cn-amount">Amount credited ({invoice.currency})</Label>
              <Input
                id="cn-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Full amount copies the invoice lines; a lower amount creates a single
                “Partial refund” line. Max {formatMoney(maxAmount, invoice.currency)}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-refund">Refund details (optional)</Label>
              <Textarea
                id="cn-refund"
                rows={5}
                value={refund}
                onChange={(e) => setRefund(e.target.value)}
                placeholder={"Refunded on … by bank transfer to …\nIBAN: …\nTransfer reference: …"}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="gold" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Undo2 />}
              Create credit note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreditNotePanel;
