"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  Eye,
  Hash,
  Landmark,
  ListOrdered,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  StickyNote,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
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
import { useImmersive } from "@/components/layout/app-chrome";
import { FadeIn, SPRING_PANEL } from "@/components/motion/primitives";
import { COMPANY, PAYMENT_BLOCK } from "@/lib/company";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { invoiceFormSchema } from "@/lib/validation/invoice";
import {
  createInvoice,
  updateInvoice,
  getNextInvoiceNumber,
} from "@/app/actions/invoices";
import {
  listClientDirectory,
  type ClientDirectoryEntry,
} from "@/app/actions/clients";
import { clientKey } from "@/lib/clients";
import type { DocumentType, Invoice } from "@/lib/supabase/types";

export interface InvoiceFormProps {
  /** When supplied, the form is in edit mode and saves via `updateInvoice`. */
  invoiceId?: string;
  /** Initial values when editing or pre-filling from an imported PDF. */
  defaultValues?: Partial<InvoiceFormShape> & Record<string, unknown>;
  /**
   * Global payment block from /settings (server-fetched). Used as the initial
   * value and as the target of "Reset to default"; falls back to the built-in
   * PAYMENT_BLOCK constant when not supplied.
   */
  defaultPaymentInstructions?: string;
  /** "credit_note" relabels the form and swaps bank details for refund details. */
  documentType?: DocumentType;
  /** Credit notes only — shown in the preview as "Original invoice #". */
  creditedInvoiceNumber?: number | null;
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

export function InvoiceForm({
  invoiceId,
  defaultValues,
  defaultPaymentInstructions,
  documentType,
  creditedInvoiceNumber,
  className,
}: InvoiceFormProps) {
  const credit = documentType === "credit_note";
  const router = useRouter();
  // Full-screen editor on phones: hide the tab bar, show our own action bar.
  useImmersive();
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<null | "draft" | "preview" | "pdf">(null);
  const [autoFilling, setAutoFilling] = React.useState(false);

  // Global block edited in /settings; the constant is only a safety net for
  // callers that don't pass it (or a DB that predates app_settings).
  // Credit notes default to no block at all: theirs holds refund details.
  const paymentDefault = React.useMemo(
    () =>
      credit
        ? ""
        : defaultPaymentInstructions && defaultPaymentInstructions.trim()
          ? defaultPaymentInstructions
          : PAYMENT_BLOCK,
    [credit, defaultPaymentInstructions],
  );

  const merged = React.useMemo(() => {
    const base = { ...EMPTY_DEFAULTS, ...(defaultValues as Partial<InvoiceFormShape>) };
    // Legacy invoices saved before payment_instructions existed have null/empty
    // — fall back to the global block so the textarea is never blank. Same when
    // the value is still the untouched constant (new-invoice defaults).
    const pi = (base as { payment_instructions?: string | null }).payment_instructions;
    if (!pi || pi.trim() === "" || pi.trim() === PAYMENT_BLOCK.trim()) {
      (base as Record<string, unknown>).payment_instructions = paymentDefault;
    }
    return base;
  }, [defaultValues, paymentDefault]);

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

  // CLIENT_MEMORY — known clients derived from past invoices. Powers the name
  // autocomplete (<datalist>) and one-shot address/currency prefill when the
  // user picks a client we already know. Fetched once on mount.
  const [knownClients, setKnownClients] = React.useState<ClientDirectoryEntry[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dir = await listClientDirectory();
        if (!cancelled) setKnownClients(dir);
      } catch {
        // Non-fatal — the form still works without autocomplete.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When the typed/selected client name exactly matches a known client, fill in
  // their address (and last currency) — but only when creating a new invoice
  // and only into an EMPTY address field, so we never clobber edits.
  const handleClientNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (invoiceId) return;
      const typed = e.target.value;
      const match = knownClients.find(
        (c) => clientKey(c.name) === clientKey(typed),
      );
      if (!match) return;
      const currentAddr = String(
        (getValues("client_address" as never) as unknown as string) ?? "",
      ).trim();
      if (currentAddr.length > 0) return; // don't overwrite existing input
      if (!match.address) return;
      setValue("client_address" as never, match.address as never, {
        shouldDirty: true,
      });
      if (match.currency) {
        setValue("currency" as never, match.currency as never, {
          shouldDirty: true,
        });
      }
      toast.message(`Infos de ${match.name} pré-remplies depuis l'historique`);
    },
    [invoiceId, knownClients, getValues, setValue],
  );

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
      className={cn("mx-auto max-w-4xl space-y-4 sm:space-y-5", className)}
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Document header — brand + live invoice number. */}
      <FormSection delay={0}>
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Logo size={44} className="sm:hidden" />
            <Logo size={56} className="hidden sm:flex" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight sm:text-base">
                {COMPANY.name}
              </p>
              <div className="mt-0.5 hidden text-xs leading-relaxed text-muted-foreground sm:block">
                {COMPANY.addressLines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="eyebrow">
              {credit ? "Credit note" : invoiceId ? "Editing" : "New invoice"}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-3xl">
              {typeof invoiceNumberWatched === "number" && invoiceNumberWatched > 0
                ? `#${invoiceNumberWatched}`
                : <span className="text-muted-foreground">#—</span>}
            </p>
          </div>
        </div>
        {!invoiceId ? (
          <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border/60 bg-secondary/40 px-4 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground">
              Have a PDF? Pre-fill this form from it.
            </p>
            <PrefillFromPdf setValue={setValue} />
          </div>
        ) : null}
      </FormSection>

      {/* Meta row */}
      <FormSection icon={<Hash />} title="Details" delay={0.04}>
        <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:gap-4 sm:p-6 sm:pt-0 lg:grid-cols-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoice_number">{credit ? "Credit note #" : "Invoice #"}</Label>
              <button
                type="button"
                onClick={handleAutofillNumber}
                disabled={autoFilling}
                aria-label="Auto-fill next invoice number"
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                {autoFilling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Next</span>
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
            <Input id="date" type="date" {...register("date" as never)} />
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
        </div>
      </FormSection>

      {/* Client card */}
      <FormSection icon={<UserRound />} title={credit ? "Credited To" : "Bill To"} delay={0.08}>
        <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:p-6 sm:pt-0 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="client_name">Client</Label>
            <Input
              id="client_name"
              placeholder="Client name"
              list="known-clients"
              autoComplete="off"
              {...register("client_name" as never, {
                onChange: handleClientNameChange,
              })}
            />
            {/* Known clients — autocomplete + memory source. */}
            <datalist id="known-clients">
              {knownClients.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
            {!invoiceId && knownClients.length > 0 ? (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 shrink-0" />
                Astuce : choisissez un client connu pour remplir son adresse
                automatiquement.
              </p>
            ) : null}
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
        </div>
      </FormSection>

      {/* Currency + Line Items */}
      <FormSection
        icon={<ListOrdered />}
        title="Line Items"
        delay={0.12}
        aside={
          <div className="w-32 sm:w-56">
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
        }
      >
        <div className="p-4 pt-0 sm:p-6 sm:pt-0">
          <LineItems control={control} register={register} watch={watch} />
        </div>
      </FormSection>

      {/* Totals */}
      <FadeIn delay={0.16}>
        <TotalsSummary
          register={register}
          control={control}
          setValue={setValue}
        />
      </FadeIn>

      {/* Notes */}
      <FormSection icon={<StickyNote />} title="Notes" delay={0.2}>
        <div className="p-4 pt-0 sm:p-6 sm:pt-0">
          <Textarea
            placeholder="Optional notes shown on the invoice (e.g. project reference)…"
            rows={4}
            {...register("notes" as never)}
          />
        </div>
      </FormSection>

      {/* Payment instructions — defaults to the global block from /settings,
          overridable per invoice (an edit here only affects this invoice). */}
      <FormSection
        icon={<Landmark />}
        title={credit ? "Refund Details" : "Payment Instructions"}
        delay={0.24}
        aside={
          credit ? undefined : <button
            type="button"
            onClick={() =>
              setValue("payment_instructions" as never, paymentDefault as never, {
                shouldDirty: true,
              })
            }
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to default
          </button>
        }
      >
        <div className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
          <Textarea
            placeholder={
              credit
                ? "Refunded on … by bank transfer to …\nIBAN: …\nTransfer reference: …"
                : "Card paiement, bank details, crypto…"
            }
            rows={credit ? 8 : 14}
            className="font-mono text-xs leading-relaxed sm:text-xs"
            {...register("payment_instructions" as never)}
          />
          {credit ? (
            <p className="text-[11px] text-muted-foreground">
              Shown in the “Refund details” section of the credit note. Leave
              empty to omit the section — our bank details are never printed
              on a credit note.
            </p>
          ) : (
          <p className="text-[11px] text-muted-foreground">
            Shown in the “Payment Information” section of the preview and PDF.
            Lines that end with “:” render as section headings in the PDF.
            Editing here overrides this invoice only — to change the bank
            details on every invoice, use{" "}
            <Link
              href="/settings"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Settings → Payment Details
            </Link>
            .
          </p>
          )}
        </div>
      </FormSection>

      {/* Validation summary */}
      <AnimatePresence>
        {formErrorList.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="alert"
            className="space-y-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <div className="font-medium">Please fix the following:</div>
            <ul className="list-disc pl-5">
              {formErrorList.map(([field, err]) => (
                <li key={field}>
                  <span className="font-mono text-xs">{field}</span> —{" "}
                  {(err as { message?: string })?.message || "Invalid value"}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Fixed action bar — the form is "immersive": the tab bar is hidden. */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING_PANEL, delay: 0.15 }}
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/85 pb-safe shadow-[0_-12px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150 lg:left-[var(--sidebar-width)]"
      >
        <div className="container max-w-4xl py-3">
          <div className="mb-2.5 flex items-baseline justify-between px-1 sm:hidden">
            <span className="eyebrow">Total</span>
            <LiveTotal control={control} currency={currencyWatched} className="min-w-0 truncate text-base" />
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-auto hidden min-w-0 sm:block">
              <p className="eyebrow">Total</p>
              <LiveTotal control={control} currency={currencyWatched} className="truncate text-lg" />
            </div>

            <Button
              type="button"
              variant="ghost"
              asChild
              className="h-12 w-12 shrink-0 rounded-2xl px-0 sm:h-10 sm:w-auto sm:px-3"
            >
              <Link href={invoiceId ? `/invoices/${invoiceId}` : "/dashboard"} aria-label="Cancel">
                <X />
                <span className="hidden sm:inline">Cancel</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={submitting !== null}
              aria-label="Save draft"
              className="h-12 w-12 shrink-0 rounded-2xl px-0 sm:h-10 sm:w-auto sm:px-4"
            >
              {submitting === "draft" ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSaveAndPreview}
              disabled={submitting !== null}
              aria-label="Save and preview"
              className="h-12 w-12 shrink-0 rounded-2xl px-0 sm:h-10 sm:w-auto sm:px-4"
            >
              {submitting === "preview" ? <Loader2 className="animate-spin" /> : <Eye />}
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={onSaveAndDownload}
              disabled={submitting !== null}
              className="h-12 min-w-0 flex-1 rounded-2xl px-4 sm:h-10 sm:flex-none"
            >
              {submitting === "pdf" ? <Loader2 className="animate-spin" /> : <Download />}
              <span className="sm:hidden">Save &amp; PDF</span>
              <span className="hidden sm:inline">Save &amp; Download PDF</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="p-0 pt-6 sm:max-w-4xl sm:p-0">
          <DialogHeader className="px-5 sm:px-6 sm:pt-6">
            <DialogTitle>{credit ? "Credit Note Preview" : "Invoice Preview"}</DialogTitle>
          </DialogHeader>
          <div className="p-3 pt-0 sm:p-6 sm:pt-0">
            <InvoicePreview
              invoice={
                {
                  ...getValues(),
                  document_type: documentType,
                  credited_invoice_number: creditedInvoiceNumber,
                } as never
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

/** Card section with an icon header; fades up on mount. */
function FormSection({
  icon,
  title,
  aside,
  delay = 0,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  aside?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <FadeIn delay={delay} className="luxury-card">
      {title ? (
        <div className="flex items-center justify-between gap-3 p-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground [&_svg]:h-4 [&_svg]:w-4">
                {icon}
              </span>
            ) : null}
            <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </FadeIn>
  );
}

/**
 * Live grand total. Owns its own form-wide useWatch so typing re-renders only
 * this <span>, never the inputs (see the scoped-useWatch note above).
 */
function LiveTotal({
  control,
  currency,
  className,
}: {
  control: Control<InvoiceFormShape>;
  currency: string;
  className?: string;
}) {
  const values = useWatch({ control }) as unknown as Parameters<typeof computeTotals>[0];
  const { total } = computeTotals(values ?? {});
  return (
    <span className={cn("block font-semibold tabular-nums", className)}>
      {formatMoney(total, currency)}
    </span>
  );
}

export default InvoiceForm;
