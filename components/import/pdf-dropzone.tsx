"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
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
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "luxury-card border-2 border-dashed transition-colors px-6 py-12 sm:py-16 text-center cursor-pointer",
          isDragActive
            ? "border-gold/60 bg-gold/5"
            : "border-border/40 hover:border-gold/40 hover:bg-secondary/30",
          isDragReject && "border-destructive/60",
          parsing && "pointer-events-none opacity-70",
        )}
      >
        <input {...getInputProps()} aria-label="Upload PDF" />
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-gold/10 text-gold p-4">
            {parsing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>
          <div>
            <p className="font-serif text-2xl">
              {parsing
                ? "Parsing your PDF…"
                : isDragActive
                  ? "Drop to begin parsing"
                  : "Drop a PDF invoice here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {parsing
                ? "Extracting line items, totals and metadata"
                : "or click to browse — only .pdf, up to 25MB"}
            </p>
          </div>
          {fileName && !parsing ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
              <FileUp className="h-3 w-3" />
              {fileName}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={parsed !== null}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Confirm imported invoice</DialogTitle>
            <DialogDescription>
              Review the parsed fields below. Correct anything that looks off,
              then confirm to save.
            </DialogDescription>
          </DialogHeader>

          {parsed?.items?.length ? (
            <div className="rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-sm">
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

          <DialogFooter>
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
