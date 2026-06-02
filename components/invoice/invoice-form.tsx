"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Download, Eye, Loader2, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencySelect } from "@/components/invoice/currency-select";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import {
  LineItems,
  toNumberLoose,
  type InvoiceFormShape,
} from "@/components/invoice/line-items";
import { PrefillFromPdf } from "@/components/invoice/prefill-from-pdf";
import {
  TotalsSummary,
  computeTotals,
} from "@/components/invoice/totals-summary";
import { COMPANY, PAYMENT_BLOCK } from "@/lib/company";
import { cn } from "@/lib/utils";
import { invoiceFormSchema } from "@/lib/validation/invoice";
import {
  createInvoice,
  updateInvoice,
  getNextInvoiceNumber,
} from "@/app/actions/invoices";
import type { Invoice } from "@/lib/supabase/types";

export interface InvoiceFormProps {
  /** When supplied, the form is in edit mode and saves via `updateInvoice`. */
  invoiceId?: string;
  /** Initial values when editing or pre-filling from an imported PDF. */
  defaultValues?: Partial<InvoiceFormShape> & Record<string, unknown>;
  className?: string;
}

// `date` must stay empty in the SSR-rendered tree so server and client agree.
// We populate today's date in an effect after mount (see TODAY_DATE_EFFECT below).
const EMPTY_DEFAULTS: InvoiceFormShape = {
  invoice_number: undefined as unknown as number,
  date: "",
  payment_terms: "Due on receipt",
  payment_instructions: PAYMENT_BLOCK,
  po_number: "",
  client_name: "",
  client_address: "",
  currency: "USD",
  items: [{ description: "", quantity: 1, unit_price: 0 }],
  tax_rate: 0,
  discount: 0,
  shipping: 0,
  to_be_paid: 0,
  notes: "",
} as unknown as InvoiceFormShape;

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function InvoiceForm({ invoiceId, defaultValues, className }: InvoiceFormProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<null | "draft" | "preview" | "pdf">(null);
  const [autoFilling, setAutoFilling] = React.useState(false);

  const merged = React.useMemo(() => {
    const base = { ...EMPTY_DEFAULTS, ...(defaultValues as Partial<InvoiceFormShape>) };
    // Legacy invoices saved before payment_instructions existed have null/empty
    // — fall back to the company default so the textarea is never blank.
    const pi = (base as { payment_instructions?: string | null }).payment_instructions;
    if (!pi || (typeof pi === "string" && pi.trim() === "")) {
      (base as Record<string, unknown>).payment_instructions = PAYMENT_BLOCK;
    }
    return base;
  }, [defaultValues]);

  const form = useForm<InvoiceFormShape>({
    resolver: zodResolver(invoiceFormSchema) as never,
    defaultValues: merged,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  // TODAY_DATE_EFFECT — populate today's date on the client only, post-mount,
  // to avoid SSR/CSR hydration mismatch (module-scope `new Date()` diverges
  // across hot reloads).
  React.useEffect(() => {
    const current = (getValues("date" as never) as unknown as string) ?? "";
    if (!current) {
      setValue("date" as never, todayLocalISO() as never, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [getValues, setValue]);

  // AUTO_NUMBER_EFFECT — when creating a new invoice from scratch (not editing
  // and not pre-filled by an imported PDF), fetch the next available invoice
  // number on mount so the field is populated without user intervention.
  React.useEffect(() => {
    if (invoiceId) return; // edit mode: keep the existing number.
    const preset = getValues("invoice_number" as never) as unknown as
      | number
      | undefined;
    if (typeof preset === "number" && Number.isFinite(preset) && preset > 0) {
      return; // already populated (e.g. PDF prefill); don't overwrite.
    }
    let cancelled = false;
    (async () => {
      try {
        const next = await getNextInvoiceNumber();
        if (cancelled) return;
        setValue("invoice_number" as never, next as never, {
          shouldDirty: false,
          shouldValidate: false,
        });
      } catch {
        // Silent: the user can still click "Auto-fill next" or type a number
        // manually. We don't want a toast on mount.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, getValues, setValue]);

  // DELIBERATE: scoped useWatch instead of `watch()`. Subscribing to the
  // whole form here causes InvoiceForm to re-render on every keystroke
  // (including line item typing), which cascades through LineItems and
  // forces register() to re-emit fresh refs — react-hook-form then
  // resets the DOM input value to the stored one and the user's character
  // is silently discarded. The header (#) and currency selector are the
  // only two values this component actually reads, so we subscribe to
  // just those two paths.
  const invoiceNumberWatched = useWatch({ control, name: "invoice_number" as never }) as unknown as
    | number
    | undefined;
  const currencyWatched = (useWatch({ control, name: "currency" as never }) as unknown as
    | string
    | undefined) ?? "USD";

  const handleAutofillNumber = async () => {
    try {
      setAutoFilling(true);
      const next = await getNextInvoiceNumber();
      setValue("invoice_number" as never, next as never, { shouldDirty: true });
      toast.success(`Next available number: ${next}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to fetch next invoice number",
      );
    } finally {
      setAutoFilling(false);
    }
  };

  const persist = async (payload: InvoiceFormShape): Promise<Invoice> => {
    const totals = computeTotals(payload);
    const p = payload as unknown as Record<string, unknown>;
    const taxRate = toNumberLoose(p.tax_rate);
    const discount = toNumberLoose(p.discount);
    const shipping = toNumberLoose(p.shipping);
    const toBePaidRaw = toNumberLoose(p.to_be_paid);
    const enriched = {
      invoice_number: toNumberLoose(p.invoice_number),
      client_name: String(p.client_name ?? ""),
      client_address: (p.client_address as string) || null,
      date: String(p.date ?? new Date().toISOString().slice(0, 10)),
      payment_terms: (p.payment_terms as string) || null,
      payment_instructions: (p.payment_instructions as string) || null,
      po_number: (p.po_number as string) || null,
      currency: String(p.currency ?? "USD").toUpperCase(),
      items: (payload.items ?? []).map((it) => {
        const q = toNumberLoose(it.quantity);
        const u = toNumberLoose(it.unit_price);
        return {
          description: String(it.description ?? ""),
          quantity: q,
          unit_price: u,
          amount: Number((q * u).toFixed(2)),
        };
      }),
      subtotal: totals.subtotal,
      tax_rate: taxRate,
      tax_amount: totals.taxAmount,
      discount,
      shipping,
      total: totals.total,
      to_be_paid: Number.isFinite(toBePaidRaw) && toBePaidRaw >= 0 ? toBePaidRaw : totals.total,
      notes: (p.notes as string) || null,
    };
    if (invoiceId) {
      return await updateInvoice(invoiceId, enriched);
    }
    return await createInvoice(enriched);
  };

  const onSaveDraft = handleSubmit(async (data) => {
    try {
      setSubmitting("draft");
      const inv = await persist(data);
      toast.success("Draft saved");
      router.push(`/invoices/${inv.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setSubmitting(null);
    }
  });

  const onSaveAndPreview = handleSubmit(async (data) => {
    try {
      setSubmitting("preview");
      await persist(data);
      setPreviewOpen(true);
      toast.success("Invoice saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save invoice");
    } finally {
      setSubmitting(null);
    }
  });

  const onSaveAndDownload = handleSubmit(async (data) => {
    try {
      setSubmitting("pdf");
      const inv = await persist(data);
      // Lazy-load the PDF renderer: @react-pdf/renderer pulls in Node-only
      // modules that crash Next's SSR pass over this client component.
      const { renderInvoicePdfBlob, invoicePdfFilename } = await import(
        "@/lib/pdf/generate"
      );
      const blob = await renderInvoicePdfBlob(inv);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = invoicePdfFilename(inv);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
      router.push(`/invoices/${inv.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setSubmitting(null);
    }
  });

  const formErrorList = Object.entries(errors).slice(0, 4);

  return (
    <form
      className={cn("space-y-6 pb-32", className)}
      onSubmit={(e) => e.preventDefault()}
    >
      {/* PDF prefill — visible only when creating a new invoice. */}
      {!invoiceId ? (
        <div className="flex items-center justify-end">
          <PrefillFromPdf setValue={setValue} />
        </div>
      ) : null}

      {/* Company header card */}
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-start justify-between gap-6 pb-6">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">
                {COMPANY.name}
              </CardTitle>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {COMPANY.addressLines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {invoiceId ? "Edit Invoice" : "New Invoice"}
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums leading-none">
              {typeof invoiceNumberWatched === "number" && invoiceNumberWatched > 0
                ? `#${invoiceNumberWatched}`
                : <span className="text-muted-foreground">#—</span>}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Meta row */}
      <Card className="luxury-card">
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoice_number">Invoice #</Label>
              <button
                type="button"
                onClick={handleAutofillNumber}
                disabled={autoFilling}
                className="text-[11px] uppercase tracking-widest text-gold hover:text-gold-400 disabled:opacity-50 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Auto-fill next
              </button>
            </div>
            <Input
              id="invoice_number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              {...register("invoice_number" as never)}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date" as never)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              placeholder="Due on receipt"
              {...register("payment_terms" as never)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po_number">PO Number</Label>
            <Input
              id="po_number"
              placeholder="Optional"
              {...register("po_number" as never)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Client card */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="text-lg">Bill To</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="client_name">Client</Label>
            <Input
              id="client_name"
              placeholder="Client name"
              {...register("client_name" as never)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_address">Delivery Address</Label>
            <Textarea
              id="client_address"
              placeholder="Optional"
              rows={3}
              {...register("client_address" as never)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Currency + Line Items */}
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Line Items</CardTitle>
          <div className="w-56">
            <CurrencySelect
              id="currency"
              value={currencyWatched}
              onChange={(code) =>
                setValue("currency" as never, code as never, {
                  shouldDirty: true,
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <LineItems control={control} register={register} watch={watch} />
        </CardContent>
      </Card>

      {/* Totals */}
      <TotalsSummary
        register={register}
        control={control}
        setValue={setValue}
      />

      {/* Notes */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional notes shown on the invoice (e.g. project reference)…"
            rows={4}
            {...register("notes" as never)}
          />
        </CardContent>
      </Card>

      {/* Payment instructions — defaults to the company PAYMENT_BLOCK, editable per invoice. */}
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payment Instructions</CardTitle>
          <button
            type="button"
            onClick={() =>
              setValue("payment_instructions" as never, PAYMENT_BLOCK as never, {
                shouldDirty: true,
              })
            }
            className="text-[11px] uppercase tracking-widest text-gold hover:text-gold-400 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Reset to default
          </button>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Card paiement, bank details, crypto…"
            rows={18}
            className="font-mono text-xs leading-relaxed"
            {...register("payment_instructions" as never)}
          />
          <p className="text-[11px] text-muted-foreground">
            Shown in the “Payment Information” section of the preview and PDF.
            Lines that end with “:” render as section headings in the PDF.
          </p>
        </CardContent>
      </Card>

      {/* Validation summary */}
      {formErrorList.length > 0 ? (
        <div className="luxury-card p-4 border-destructive/40 text-sm text-destructive space-y-1">
          <div className="font-medium">Please fix the following:</div>
          <ul className="list-disc pl-5">
            {formErrorList.map(([field, err]) => (
              <li key={field}>
                <span className="font-mono text-xs">{field}</span> —{" "}
                {(err as { message?: string })?.message || "Invalid value"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Sticky footer — grid on phone (2 rows of 2), inline on desktop. */}
      <div className="no-print fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container py-3">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              asChild
              disabled={submitting !== null}
              className="h-11 sm:h-9"
            >
              <Link href="/dashboard">
                <X className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={submitting !== null}
              className="h-11 sm:h-9"
            >
              {submitting === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="sm:hidden">Draft</span>
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveAndPreview}
              disabled={submitting !== null}
              className="h-11 sm:h-9"
            >
              {submitting === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sm:hidden">Preview</span>
              <span className="hidden sm:inline">Save & Preview</span>
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={onSaveAndDownload}
              disabled={submitting !== null}
              className="h-11 sm:h-9"
            >
              {submitting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">Save & Download PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            <InvoicePreview invoice={getValues() as never} />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

export default InvoiceForm;
