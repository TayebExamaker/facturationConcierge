"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { formatMoney, formatDate, formatInvoiceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteInvoice,
  setInvoiceStatus,
} from "@/app/actions/invoices";
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

export function InvoiceTable({ invoices, className }: InvoiceTableProps) {
  const router = useRouter();
  const [sort, setSort] = React.useState<SortState>({
    key: "date",
    dir: "desc",
  });
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const sorted = React.useMemo(
    () => [...invoices].sort((a, b) => compare(a, b, sort)),
    [invoices, sort],
  );

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sort.dir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const headers: ReadonlyArray<{ key: SortKey; label: string; align?: "right" | "left" }> = [
    { key: "invoice_number", label: "#" },
    { key: "client", label: "Client" },
    { key: "date", label: "Date" },
    { key: "total", label: "Amount", align: "right" },
    { key: "currency", label: "Currency" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
  ];

  const onMarkPaid = async (id: string) => {
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

  const onDelete = async (id: string) => {
    if (!confirm("Delete this invoice? This action cannot be undone.")) return;
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

  if (invoices.length === 0) {
    return (
      <div className="luxury-card p-12 text-center">
        <p className="font-serif text-xl">No invoices yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first invoice or import one from PDF.
        </p>
      </div>
    );
  }

  // Map key → responsive visibility class. # / Client / Status / Total are
  // shown on mobile; date / currency / source progressively unlock at sm and md.
  const colVisibility: Record<SortKey, string> = {
    invoice_number: "",
    client: "",
    date: "hidden sm:table-cell",
    total: "",
    currency: "hidden md:table-cell",
    status: "",
    source: "hidden lg:table-cell",
  };

  return (
    <div className={cn("luxury-card overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((h) => (
              <TableHead
                key={h.key}
                className={cn(
                  "cursor-pointer select-none",
                  h.align === "right" && "text-right",
                  colVisibility[h.key],
                )}
                onClick={() => toggleSort(h.key)}
              >
                {h.label}
                {sortIcon(h.key)}
              </TableHead>
            ))}
            <TableHead className="text-right w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((inv) => {
            const r = inv as unknown as Record<string, unknown>;
            const id = String(r.id ?? "");
            const number = r.invoice_number as number | string | undefined;
            const client =
              (r.client_name as string | undefined) ??
              (r.client as string | undefined) ??
              "—";
            const issueDate = (r.date as string | undefined) ?? null;
            const total = Number(r.total ?? 0);
            const currency = String(r.currency ?? "USD");
            const status = r.status as string | undefined;
            const source = String(r.source ?? "manual");

            return (
              <TableRow
                key={id}
                className={cn(
                  "cursor-pointer",
                  pendingId === id && "opacity-60",
                )}
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
                <TableCell className="font-mono text-sm">
                  {formatInvoiceLabel(number, client)}
                </TableCell>
                <TableCell className="font-medium">{client}</TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {issueDate ? formatDate(issueDate) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(total, currency)}
                </TableCell>
                <TableCell className="uppercase tracking-wider text-xs text-muted-foreground hidden md:table-cell">
                  {currency}
                </TableCell>
                <TableCell>
                  <StatusPill status={status} />
                </TableCell>
                <TableCell className="text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  {source}
                </TableCell>
                <TableCell className="text-right" data-row-action>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => router.push(`/invoices/${id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => router.push(`/invoices/${id}?edit=1`)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onMarkPaid(id)}>
                        <CheckCircle2 className="h-4 w-4 text-gold" />
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default InvoiceTable;
