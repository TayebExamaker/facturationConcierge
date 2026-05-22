"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setInvoiceStatus } from "@/app/actions/invoices";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/types";

const STATUSES: ReadonlyArray<{ value: InvoiceStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export interface InvoiceActionsProps {
  invoice: Invoice;
  onEdit?: () => void;
  isEditing?: boolean;
  className?: string;
}

export function InvoiceActions({
  invoice,
  onEdit,
  isEditing,
  className,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [downloading, setDownloading] = React.useState(false);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState<InvoiceStatus>(
    (invoice.status as InvoiceStatus) ?? "draft",
  );

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const { renderInvoicePdfBlob, invoicePdfFilename } = await import(
        "@/lib/pdf/generate"
      );
      const blob = await renderInvoicePdfBlob(invoice);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = invoicePdfFilename(invoice);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (value: string) => {
    const next = value as InvoiceStatus;
    setLocalStatus(next);
    try {
      setUpdatingStatus(true);
      await setInvoiceStatus(invoice.id, next);
      toast.success(`Status updated to ${next}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
      setLocalStatus((invoice.status as InvoiceStatus) ?? "draft");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="min-w-40">
        <Select value={localStatus} onValueChange={handleStatusChange}>
          <SelectTrigger
            disabled={updatingStatus}
            aria-label="Change invoice status"
          >
            <span className="flex items-center gap-2">
              {updatingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-gold" />
              )}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {onEdit ? (
        <Button variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          {isEditing ? "View" : "Edit"}
        </Button>
      ) : null}

      <Button variant="outline" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Print
      </Button>

      <Button variant="gold" onClick={handleDownload} disabled={downloading}>
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download PDF
      </Button>
    </div>
  );
}

export default InvoiceActions;
