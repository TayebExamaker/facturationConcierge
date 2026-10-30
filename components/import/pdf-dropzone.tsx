"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "motion/react";
import { FileUp, Loader2, Upload, Check, X } from "lucide-react";
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
import { CurrencySelect } from "@/components/invoice/currency-select";
import { cn } from "@/lib/utils";
import {
  createInvoice,
  parseInvoicePdfOnly,
  getNextInvoiceNumber,
} from "@/app/actions/invoices";
import type { InvoiceItem } from "@/lib/supabase/types";

interface ParsedInvoice {
  invoice_number?: number | string | null;
  date?: string | null;
  client_name?: string | null;
  client_address?: string | null;
  currency?: string | null;
  total?: number | null;
  items?: InvoiceItem[] | null;
  notes?: string | null;
  warnings?: string[];
  [key: string]: unknown;
}

export interface PdfDropzoneProps {
  className?: string;
}

export function PdfDropzone({ className }: PdfDropzoneProps) {
  const router = useRouter();
  const [parsing, setParsing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedInvoice | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const onDrop = React.useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setFileName(file.name);
    try {
      setParsing(true);
      const fd = new FormData();
      fd.append("file", file);
      const preview = await parseInvoicePdfOnly(fd);
      // If invoice_number wasn't detected, suggest the next free one.
      let suggestedNumber = preview.invoice_number;
      if (suggestedNumber === undefined) {
        try {
          suggestedNumber = await getNextInvoiceNumber();
        } catch {
          // Non-fatal — user can fill it in.
        }
      }
      // When the line-item table was read, prefer the items' subtotal as the
      // total — it's the ground truth for what will land on the invoice.
      const itemsSubtotal = (preview.items ?? []).reduce(
        (sum, it) => sum + (it.amount || 0),
        0,
      );
      setParsed({
        invoice_number: suggestedNumber ?? null,
        date: preview.date ?? null,
        client_name: preview.client_name ?? null,
        client_address: preview.client_address ?? null,
        currency: (preview.currency ?? "USD").toUpperCase(),
        total: preview.items?.length ? itemsSubtotal : preview.total ?? null,
        items: preview.items ?? null,
        notes: null,
        warnings: preview.warnings,
      });
      toast.success("Invoice parsed — review and confirm below");
      if (preview.warnings.length > 0) {
        preview.warnings.slice(0, 2).forEach((w) => toast.warning(w));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse PDF");
      setFileName(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    maxSize: 25 * 1024 * 1024,
    disabled: parsing,
  });

  const updateField = <K extends keyof ParsedInvoice>(
    key: K,
    value: ParsedInvoice[K],
  ) => {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    try {
      setConfirming(true);
      const num =
        typeof parsed.invoice_number === "number"
          ? parsed.invoice_number
          : Number(parsed.invoice_number);
      if (!Number.isFinite(num) || num <= 0) {
        toast.error("Please enter a valid invoice number");
        setConfirming(false);
        return;
      }
      // Use the parsed line items when present; otherwise drop the total into a
      // single editable line so nothing is lost.
      const parsedItems = parsed.items ?? [];
      const items: InvoiceItem[] = parsedItems.length
        ? parsedItems
        : (() => {
            const t = Number(parsed.total ?? 0) || 0;
            return t
              ? [{ description: "Imported invoice", quantity: 1, unit_price: t, amount: t }]
              : [];
          })();
      const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
      const total = parsedItems.length ? subtotal : Number(parsed.total ?? 0) || 0;
      const today = new Date().toISOString().slice(0, 10);
      const created = await createInvoice({
        invoice_number: num,
        client_name: (parsed.client_name ?? "Unknown Client") || "Unknown Client",
        client_address: (parsed.client_address as string | null) || null,
        date: (parsed.date as string | null) || today,
        currency: ((parsed.currency as string | null) || "USD").toUpperCase(),
        items,
        subtotal,
        tax_rate: 0,
        tax_amount: 0,
        discount: 0,
        shipping: 0,
        total,
        to_be_paid: total,
        notes: (parsed.notes as string | null) || null,
        status: "draft",
        source: "imported",
      });
      toast.success("Invoice imported");
      router.push(`/invoices/${created.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import invoice");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    setParsed(null);
    setFileName(null);
  };

  return (
    <div className={cn("space-y-5", className)}>
      <motion.div
        animate={{ scale: isDragActive ? 1.015 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors sm:py-20",
            isDragActive
              ? "border-foreground/50 bg-secondary/60"
              : "border-border hover:border-foreground/30 hover:bg-secondary/30",
            isDragReject && "border-destructive/60 bg-destructive/5",
            parsing && "pointer-events-none",
          )}
        >
          <input {...getInputProps()} aria-label="Upload PDF" />

          {/* Scanning beam while the server parses the PDF. */}
          <AnimatePresence>
            {parsing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0"
              >
                <motion.div
                  className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-foreground/[0.06] to-transparent"
                  animate={{ y: ["-100%", "400%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="relative flex flex-col items-center gap-4">
            <motion.div
              animate={
                parsing
                  ? { y: 0, rotate: 0 }
                  : isDragActive
                    ? { y: -8, rotate: -6 }
                    : { y: [0, -6, 0] }
              }
              transition={
                parsing || isDragActive
                  ? { type: "spring", stiffness: 300, damping: 20 }
                  : { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative"
            >
              <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-secondary blur-2xl" />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-[0_16px_32px_-12px_rgba(15,23,42,0.6)]">
                {parsing ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Upload className="h-7 w-7" />
                )}
              </div>
            </motion.div>
            <div>
              <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                {parsing
                  ? "Reading your PDF…"
                  : isDragActive
                    ? "Drop to start"
                    : (
                      <>
                        <span className="hidden sm:inline">Drop a PDF invoice here</span>
                        <span className="sm:hidden">Choose a PDF invoice</span>
                      </>
                    )}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {parsing
                  ? "Extracting line items, totals and metadata"
                  : (
                    <>
                      <span className="hidden sm:inline">or click to browse — </span>
                      <span className="sm:hidden">Tap to browse — </span>
                      PDF only, up to 25 MB
                    </>
                  )}
              </p>
            </div>
            {fileName && !parsing ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 flex max-w-full items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground"
              >
                <FileUp className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{fileName}</span>
              </motion.div>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { n: 1, label: "Drop the PDF" },
          { n: 2, label: "Review fields" },
          { n: 3, label: "Save invoice" },
        ].map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="luxury-card flex flex-col items-center gap-2 p-3 text-center sm:flex-row sm:p-4 sm:text-left"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              {step.n}
            </span>
            <span className="text-xs font-medium sm:text-sm">{step.label}</span>
          </motion.div>
        ))}
      </div>

      <Dialog
        open={parsed !== null}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm imported invoice</DialogTitle>
            <DialogDescription>
              Review the parsed fields below. Correct anything that looks off,
              then confirm to save.
            </DialogDescription>
          </DialogHeader>

          {parsed?.items?.length ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm">
              <span className="font-medium text-foreground">
                {parsed.items.length} line item
                {parsed.items.length === 1 ? "" : "s"} detected
              </span>{" "}
              <span className="text-muted-foreground">
                — you can edit them after saving.
              </span>
            </div>
          ) : null}

          {parsed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="imp-number">Invoice #</Label>
                <Input
                  id="imp-number"
                  type="number"
                  value={(parsed.invoice_number as number | string | undefined) ?? ""}
                  onChange={(e) =>
                    updateField(
                      "invoice_number",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imp-date">Date</Label>
                <Input
                  id="imp-date"
                  type="date"
                  value={(parsed.date as string | undefined) ?? ""}
                  onChange={(e) => updateField("date", e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="imp-client">Client</Label>
                <Input
                  id="imp-client"
                  value={(parsed.client_name as string | undefined) ?? ""}
                  onChange={(e) => updateField("client_name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imp-currency">Currency</Label>
                <CurrencySelect
                  id="imp-currency"
                  value={(parsed.currency as string | undefined) ?? "USD"}
                  onChange={(c) => updateField("currency", c)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imp-total">Total</Label>
                <Input
                  id="imp-total"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={(parsed.total as number | undefined) ?? 0}
                  onChange={(e) =>
                    updateField(
                      "total",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="imp-notes">Notes</Label>
                <Textarea
                  id="imp-notes"
                  rows={3}
                  value={(parsed.notes as string | undefined) ?? ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={confirming}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PdfDropzone;
