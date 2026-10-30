"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Download, Eye, Loader2, Pencil, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { STATUS_TONE } from "@/components/invoice/status-pill";
import { SPRING_LAYOUT } from "@/components/motion/primitives";
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
  /** When true the "Edit" tile becomes "View" (we're on the edit screen). */
  isEditing?: boolean;
  className?: string;
}

async function buildPdf(invoice: Invoice): Promise<{ blob: Blob; filename: string }> {
  // Lazy-load: @react-pdf/renderer breaks SSR when imported statically.
  const { renderInvoicePdfBlob, invoicePdfFilename } = await import("@/lib/pdf/generate");
  const blob = await renderInvoicePdfBlob(invoice);
  return { blob, filename: invoicePdfFilename(invoice) };
}

export function InvoiceActions({ invoice, isEditing, className }: InvoiceActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "pdf" | "share">(null);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState<InvoiceStatus>(
    (invoice.status as InvoiceStatus) ?? "draft",
  );
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    // Web Share with files: iOS Safari / Android Chrome — the native share sheet.
    try {
      const probe = new File([""], "probe.pdf", { type: "application/pdf" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  const handleDownload = async () => {
    try {
      setBusy("pdf");
      const { blob, filename } = await buildPdf(invoice);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    try {
      setBusy("share");
      const { blob, filename } = await buildPdf(invoice);
      const file = new File([blob], filename, { type: "application/pdf" });
      await navigator.share({ files: [file], title: filename });
    } catch (e) {
      // AbortError = user closed the share sheet; not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Failed to share PDF");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleStatusChange = async (next: InvoiceStatus) => {
    if (next === localStatus || updatingStatus) return;
    const previous = localStatus;
    setLocalStatus(next);
    try {
      setUpdatingStatus(true);
      await setInvoiceStatus(invoice.id, next);
      toast.success(`Status updated to ${next}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
      setLocalStatus(previous);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const editHref = isEditing ? `/invoices/${invoice.id}` : `/invoices/${invoice.id}?edit=1`;

  return (
    <div className={cn("flex flex-col gap-3 xl:items-end", className)}>
      {/* Segmented status control */}
      <div
        role="radiogroup"
        aria-label="Invoice status"
        className={cn(
          "grid grid-cols-4 gap-1 rounded-2xl border border-border/70 bg-card p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:w-[26rem] md:max-w-full",
          updatingStatus && "opacity-80",
        )}
      >
        {STATUSES.map((s) => {
          const active = localStatus === s.value;
          return (
            <motion.button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStatusChange(s.value)}
              className={cn(
                "relative flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="status-segment"
                  transition={SPRING_LAYOUT}
                  className={cn("absolute inset-0 rounded-xl border", STATUS_TONE[s.value].pill)}
                />
              ) : null}
              <span className="relative flex items-center gap-1.5">
                {active && updatingStatus ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_TONE[s.value].dot)} />
                )}
                {s.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Action tiles: icon-over-label grid on phones, inline buttons on desktop. */}
      <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap xl:justify-end">
        <ActionTile asLink href={editHref} icon={isEditing ? <Eye /> : <Pencil />} label={isEditing ? "View" : "Edit"} />
        {canShare ? (
          <ActionTile
            icon={busy === "share" ? <Loader2 className="animate-spin" /> : <Share2 />}
            label="Share"
            onClick={handleShare}
            disabled={busy !== null}
          />
        ) : (
          <ActionTile icon={<Printer />} label="Print" onClick={() => window.print()} />
        )}
        <ActionTile
          primary
          className="col-span-2"
          icon={busy === "pdf" ? <Loader2 className="animate-spin" /> : <Download />}
          label="Download PDF"
          onClick={handleDownload}
          disabled={busy !== null}
        />
      </div>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  disabled,
  primary,
  className,
  asLink,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
  asLink?: boolean;
  href?: string;
}) {
  const classes = cn(
    "flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition-[background-color,box-shadow,border-color] [&_svg]:h-5 [&_svg]:w-5",
    "md:h-10 md:w-auto md:flex-row md:gap-2 md:rounded-xl md:px-4 md:text-sm md:[&_svg]:h-4 md:[&_svg]:w-4",
    primary
      ? "bg-foreground text-background shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] hover:bg-foreground/90"
      : "border border-border/70 bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-foreground/20",
    disabled && "pointer-events-none opacity-60",
  );

  return (
    <motion.div whileTap={{ scale: 0.95 }} className={className}>
      {asLink && href ? (
        <Link href={href} className={classes}>
          {icon}
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={classes}>
          {icon}
          {label}
        </button>
      )}
    </motion.div>
  );
}

export default InvoiceActions;
