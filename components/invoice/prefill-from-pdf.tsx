"use client";

import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UseFormSetValue } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { parseInvoicePdfOnly } from "@/app/actions/invoices";
import type { InvoiceFormShape } from "@/components/invoice/line-items";

export interface PrefillFromPdfProps {
  setValue: UseFormSetValue<InvoiceFormShape>;
  className?: string;
}

/**
 * Inline "Import PDF" button rendered above the invoice form.
 *
 * User picks a PDF (booking confirmation, charter quote, supplier invoice…),
 * the server parses it via parseInvoicePdfOnly, and we patch the form with
 * whatever was extracted — client name, client address, date, currency,
 * total. The user reviews/edits before saving.
 */
export function PrefillFromPdf({ setValue, className }: PrefillFromPdfProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const parsed = await parseInvoicePdfOnly(fd);

      const filled: string[] = [];
      if (parsed.client_name) {
        setValue("client_name" as never, parsed.client_name as never, {
          shouldDirty: true,
        });
        filled.push("client name");
      }
      if (parsed.client_address) {
        setValue("client_address" as never, parsed.client_address as never, {
          shouldDirty: true,
        });
        filled.push("address");
      }
      if (parsed.date) {
        setValue("date" as never, parsed.date as never, { shouldDirty: true });
        filled.push("date");
      }
      if (parsed.currency) {
        setValue("currency" as never, parsed.currency.toUpperCase() as never, {
          shouldDirty: true,
        });
        filled.push("currency");
      }
      if (parsed.items && parsed.items.length > 0) {
        // Full line-item table was read — load every row so the user can edit.
        const subtotal = parsed.items.reduce(
          (sum, it) => sum + (it.amount || 0),
          0,
        );
        setValue("items" as never, parsed.items as never, { shouldDirty: true });
        setValue("to_be_paid" as never, subtotal as never, { shouldDirty: true });
        filled.push(
          `${parsed.items.length} line item${parsed.items.length === 1 ? "" : "s"}`,
        );
      } else if (typeof parsed.total === "number" && parsed.total > 0) {
        // Drop the total into a single line item the user can adjust.
        setValue(
          "items" as never,
          [
            {
              description: parsed.client_name
                ? `Imported from ${file.name}`
                : "Imported invoice",
              quantity: 1,
              unit_price: parsed.total,
              amount: parsed.total,
            },
          ] as never,
          { shouldDirty: true },
        );
        setValue("to_be_paid" as never, parsed.total as never, {
          shouldDirty: true,
        });
        filled.push("total");
      }

      if (filled.length === 0) {
        toast.warning(
          "We couldn't extract any field from this PDF — please fill the form manually.",
        );
      } else {
        toast.success(`Pre-filled: ${filled.join(", ")}.`);
        if (parsed.warnings.length) {
          parsed.warnings
            .slice(0, 2)
            .forEach((w) => toast.message(w, { duration: 4500 }));
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse PDF");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handlePick}
        disabled={loading}
        className="h-11 sm:h-9 w-full sm:w-auto"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        {loading ? "Reading PDF…" : "Import PDF to fill"}
      </Button>
    </div>
  );
}

export default PrefillFromPdf;
