"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BottomSheet, SheetAction } from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/invoice/status-pill";
import { Avatar, EASE_OUT, SPRING_LAYOUT } from "@/components/motion/primitives";
import { formatMoney, formatDate, formatInvoiceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteInvoice, setInvoiceStatus } from "@/app/actions/invoices";
import type { Invoice } from "@/lib/supabase/types";

type SortKey =
  | "invoice_number"
  | "client"
  | "date"
  | "total"
  | "currency"
  | "status"
  | "source";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  className?: string;
}

function getField(inv: Invoice, key: SortKey): string | number {
  const i = inv as unknown as Record<string, unknown>;
  switch (key) {
    case "invoice_number":
      return Number(i.invoice_number ?? 0);
    case "client":
      return String(i.client_name ?? i.client ?? "");
    case "date":
      return String(i.date ?? "");
    case "total":
      return Number(i.total ?? 0);
    case "currency":
      return String(i.currency ?? "");
    case "status":
      return String(i.status ?? "");
    case "source":
      return String(i.source ?? "manual");
  }
}

function compare(a: Invoice, b: Invoice, sort: SortState) {
  const av = getField(a, sort.key);
  const bv = getField(b, sort.key);
  let cmp = 0;
  if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv));
  return sort.dir === "asc" ? cmp : -cmp;
}

/** "2026-10-14" → "October 2026" (UTC so the month never shifts by TZ). */
function monthLabel(isoDate: string | null | undefined): string {
  if (!isoDate || isoDate.length < 7) return "Undated";
  const [y, m] = isoDate.slice(0, 7).split("-").map(Number);
  if (!y || !m) return "Undated";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function useInvoiceMutations() {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const markPaid = async (id: string) => {
    try {
      setPendingId(id);
      await setInvoiceStatus(id, "paid");
      toast.success("Invoice marked as paid");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setPendingId(null);
    }
  };

  /** Caller is responsible for confirmation UX. */
  const remove = async (id: string) => {
    try {
      setPendingId(id);
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete invoice");
    } finally {
      setPendingId(null);
    }
  };

  return { pendingId, markPaid, remove };
}

export function InvoiceTable({ invoices, className }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className={cn("luxury-card flex flex-col items-center px-6 py-14 text-center", className)}
      >
        <div className="relative">
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-secondary blur-xl" />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-border">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-5 text-lg font-semibold tracking-tight">No invoices here</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Create your first invoice or import one from a PDF — or loosen the filters.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="outline">
            <Link href="/invoices/import">
              <Upload />
              Import
            </Link>
          </Button>
          <Button asChild variant="gold">
            <Link href="/invoices/new">
              <Plus />
              New invoice
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <div className="md:hidden">
        <MobileInvoiceList invoices={invoices} />
      </div>
      <div className="hidden md:block">
        <DesktopInvoiceTable invoices={invoices} />
      </div>
    </div>
  );
}

/* ─────────────────────── Progressive rendering ─────────────────────── */

const PAGE_SIZE = 40;

/**
 * Renders long lists in pages: the first PAGE_SIZE rows mount immediately,
 * the next page mounts when the sentinel scrolls into view. Keeps first paint
 * fast with hundreds of invoices instead of animating every row at once.
 */
function useProgressiveList<T>(items: T[]) {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const visible = React.useMemo(() => items.slice(0, limit), [items, limit]);
  const hasMore = items.length > limit;
  const loadMore = React.useCallback(() => setLimit((l) => l + PAGE_SIZE), []);
  return { visible, hasMore, loadMore, remaining: items.length - visible.length };
}

function LoadMoreSentinel({ onVisible, remaining }: { onVisible: () => void; remaining: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onVisible();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);
  return (
    <div ref={ref} className="flex justify-center py-4">
      <button
        type="button"
        onClick={onVisible}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading {Math.min(remaining, PAGE_SIZE)} more…
      </button>
    </div>
  );
}

/* ───────────────────────────── Desktop ───────────────────────────── */

function DesktopInvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const { pendingId, markPaid, remove } = useInvoiceMutations();
  const [sort, setSort] = React.useState<SortState>({ key: "date", dir: "desc" });

  const sorted = React.useMemo(
    () => [...invoices].sort((a, b) => compare(a, b, sort)),
    [invoices, sort],
  );
  const { visible, hasMore, loadMore, remaining } = useProgressiveList(sorted);

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />;
    return sort.dir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const headers: ReadonlyArray<{ key: SortKey; label: string; align?: "right"; className?: string }> = [
    { key: "client", label: "Client" },
    { key: "invoice_number", label: "Invoice", className: "hidden xl:table-cell" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source", className: "hidden xl:table-cell" },
    { key: "total", label: "Amount", align: "right" },
  ];

  const onDelete = async (id: string) => {
    if (!confirm("Delete this invoice? This action cannot be undone.")) return;
    await remove(id);
  };

  return (
    <div className="luxury-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 bg-secondary/40 hover:bg-secondary/40">
            {headers.map((h) => (
              <TableHead
                key={h.key}
                className={cn(
                  "h-11 cursor-pointer select-none text-[11px] transition-colors hover:text-foreground",
                  h.align === "right" && "text-right",
                  h.key === "client" && "pl-5",
                  h.className,
                )}
                onClick={() => toggleSort(h.key)}
              >
                {h.label}
                {sortIcon(h.key)}
              </TableHead>
            ))}
            <TableHead className="w-14 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((inv, index) => {
            const id = inv.id;
            const client = inv.client_name ?? "—";
            const label = formatInvoiceLabel(inv.invoice_number, client);

            return (
              <motion.tr
                key={id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: pendingId === id ? 0.5 : 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(index % PAGE_SIZE, 12) * 0.025 }}
                className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/40"
                onClick={(e) => {
                  // Don't navigate when the click originates from the row's
                  // actions cell OR from anything inside a Radix portal
                  // (DropdownMenu items, Dialog, Popover). React bubbles
                  // portal events back through the React parent tree, so
                  // a "Delete" click would otherwise hit this handler and
                  // push to a now-deleted invoice -> 404.
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("[data-row-action]") ||
                    target.closest("[role='menu']") ||
                    target.closest("[role='menuitem']") ||
                    target.closest("[data-radix-popper-content-wrapper]")
                  ) {
                    return;
                  }
                  router.push(`/invoices/${id}`);
                }}
              >
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={client} size={34} />
                    <span className="min-w-0">
                      <span className="block max-w-[28ch] truncate font-medium" title={client}>
                        {client}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground xl:hidden">
                        #{inv.invoice_number}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">
                  <span className="block max-w-[18ch] truncate" title={label}>
                    {label}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {inv.date ? formatDate(inv.date) : "—"}
                </TableCell>
                <TableCell>
                  <StatusPill status={inv.status} />
                </TableCell>
                <TableCell className="hidden text-xs capitalize text-muted-foreground xl:table-cell">
                  {inv.source ?? "manual"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                  {formatMoney(Number(inv.total ?? 0), inv.currency ?? "USD")}
                </TableCell>
                <TableCell className="pr-4 text-right" data-row-action>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Row actions"
                        className="h-8 w-8 rounded-lg opacity-60 transition-opacity group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => router.push(`/invoices/${id}`)}>
                        <Eye className="h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/invoices/${id}?edit=1`)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => markPaid(id)}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Mark Paid
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onDelete(id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
      {hasMore ? <LoadMoreSentinel onVisible={loadMore} remaining={remaining} /> : null}
    </div>
  );
}

/* ───────────────────────────── Mobile ───────────────────────────── */

function MobileInvoiceList({ invoices }: { invoices: Invoice[] }) {
  const { pendingId, markPaid, remove } = useInvoiceMutations();
  const [active, setActive] = React.useState<Invoice | null>(null);

  // Newest first, grouped by month — the way a banking app lists activity.
  const sorted = React.useMemo(
    () => [...invoices].sort((a, b) => compare(a, b, { key: "date", dir: "desc" })),
    [invoices],
  );
  const { visible, hasMore, loadMore, remaining } = useProgressiveList(sorted);
  const groups = React.useMemo(() => {
    const out: { label: string; items: Invoice[] }[] = [];
    for (const inv of visible) {
      const label = monthLabel(inv.date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(inv);
      else out.push({ label, items: [inv] });
    }
    return out;
  }, [visible]);

  let order = 0;

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="eyebrow mb-2 px-1">{group.label}</h3>
            <div className="luxury-card divide-y divide-border/60 overflow-hidden">
              <AnimatePresence initial={true} mode="popLayout">
                {group.items.map((inv) => {
                  const i = order++;
                  return (
                    <MobileInvoiceRow
                      key={inv.id}
                      invoice={inv}
                      index={i}
                      pending={pendingId === inv.id}
                      onMore={() => setActive(inv)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        ))}
        {hasMore ? <LoadMoreSentinel onVisible={loadMore} remaining={remaining} /> : null}
      </div>

      <InvoiceActionSheet
        invoice={active}
        onClose={() => setActive(null)}
        onMarkPaid={markPaid}
        onDelete={remove}
      />
    </>
  );
}

function MobileInvoiceRow({
  invoice,
  index,
  pending,
  onMore,
}: {
  invoice: Invoice;
  index: number;
  pending: boolean;
  onMore: () => void;
}) {
  const client = invoice.client_name ?? "—";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: pending ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ ...SPRING_LAYOUT, opacity: { duration: 0.25, delay: Math.min(index % PAGE_SIZE, 10) * 0.03 } }}
      className="relative flex items-center"
    >
      <Link
        href={`/invoices/${invoice.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 pr-1 transition-colors active:bg-secondary/60"
      >
        <Avatar name={client} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-tight">{client}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            <span className="font-mono">#{invoice.invoice_number}</span>
            <span aria-hidden="true"> · </span>
            {invoice.date ? formatDate(invoice.date) : "—"}
          </p>
        </div>
        <div className="flex max-w-[48%] shrink-0 flex-col items-end gap-1.5">
          <span className="max-w-full truncate text-[clamp(0.8rem,3.8vw,0.9375rem)] font-semibold tabular-nums">
            {formatMoney(Number(invoice.total ?? 0), invoice.currency ?? "USD")}
          </span>
          <StatusPill status={invoice.status} className="px-2 py-0 text-[10px]" />
        </div>
      </Link>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onMore}
        aria-label={`Actions for invoice ${invoice.invoice_number}`}
        className="mr-1.5 flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
      </motion.button>
    </motion.div>
  );
}

function InvoiceActionSheet({
  invoice,
  onClose,
  onMarkPaid,
  onDelete,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onMarkPaid: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  // Keep the last invoice around while the sheet animates out.
  const [shown, setShown] = React.useState<Invoice | null>(invoice);

  React.useEffect(() => {
    if (invoice) {
      setShown(invoice);
      setConfirmDelete(false);
    }
  }, [invoice]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const download = async () => {
    if (!shown) return;
    try {
      setDownloading(true);
      const { renderInvoicePdfBlob, invoicePdfFilename } = await import("@/lib/pdf/generate");
      const blob = await renderInvoicePdfBlob(shown);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = invoicePdfFilename(shown);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <BottomSheet
      open={invoice !== null}
      onOpenChange={(open) => !open && onClose()}
      title={
        shown ? (
          <span className="flex items-center gap-3">
            <Avatar name={shown.client_name} size={36} />
            <span className="min-w-0">
              <span className="block truncate">{shown.client_name ?? "—"}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                #{shown.invoice_number} ·{" "}
                {formatMoney(Number(shown.total ?? 0), shown.currency ?? "USD")}
              </span>
            </span>
          </span>
        ) : null
      }
    >
      {shown ? (
        <div className="space-y-1 pt-2">
          <SheetAction icon={<Eye />} label="View invoice" onClick={() => go(`/invoices/${shown.id}`)} />
          <SheetAction icon={<Pencil />} label="Edit" onClick={() => go(`/invoices/${shown.id}?edit=1`)} />
          <SheetAction
            icon={downloading ? <Loader2 className="animate-spin" /> : <Download />}
            label="Download PDF"
            disabled={downloading}
            onClick={download}
          />
          {shown.status !== "paid" ? (
            <SheetAction
              icon={<CheckCircle2 className="text-emerald-600" />}
              label="Mark as paid"
              onClick={() => {
                onClose();
                void onMarkPaid(shown.id);
              }}
            />
          ) : null}
          <div className="my-2 h-px bg-border/70" />
          <SheetAction
            icon={<Trash2 />}
            label={confirmDelete ? "Tap again to delete" : "Delete"}
            hint={confirmDelete ? "This cannot be undone." : undefined}
            destructive
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              onClose();
              void onDelete(shown.id);
            }}
          />
        </div>
      ) : null}
    </BottomSheet>
  );
}

export default InvoiceTable;
