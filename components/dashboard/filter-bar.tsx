"use client";

import * as React from "react";
import { Download, Filter, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { exportInvoicesCsv } from "@/app/actions/invoices";
import { CURRENCIES } from "@/lib/currencies";
import type { InvoiceStatus } from "@/lib/supabase/types";

export interface FilterValues {
  status: string;
  currency: string;
  client: string;
  from: string;
  to: string;
}

const STATUS_VALUES: readonly InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];
const isInvoiceStatus = (v: string): v is InvoiceStatus =>
  (STATUS_VALUES as readonly string[]).includes(v);

export interface FilterBarProps {
  value?: Partial<FilterValues>;
  onChange?: (filters: FilterValues) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
] as const;

export function FilterBar({ value, onChange, className }: FilterBarProps) {
  const [filters, setFilters] = React.useState<FilterValues>({
    status: value?.status ?? "all",
    currency: value?.currency ?? "all",
    client: value?.client ?? "",
    from: value?.from ?? "",
    to: value?.to ?? "",
  });
  const [exporting, setExporting] = React.useState(false);

  const update = (patch: Partial<FilterValues>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      onChange?.(next);
      return next;
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const csv = await exportInvoicesCsv({
        status:
          filters.status === "all" || !isInvoiceStatus(filters.status)
            ? undefined
            : filters.status,
        currency: filters.currency === "all" ? undefined : filters.currency,
        clientName: filters.client || undefined,
        dateFrom: filters.from || undefined,
        dateTo: filters.to || undefined,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `invoices-${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={cn(
        "luxury-card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end",
        className,
      )}
    >
      <div className="lg:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="filter-client" className="text-xs uppercase tracking-widest text-muted-foreground">
          Client
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="filter-client"
            placeholder="Search client name"
            className="pl-8"
            value={filters.client}
            onChange={(e) => update({ client: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Status
        </Label>
        <Select
          value={filters.status}
          onValueChange={(v) => update({ status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Currency
        </Label>
        <Select
          value={filters.currency}
          onValueChange={(v) => update({ currency: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All currencies</SelectItem>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from" className="text-xs uppercase tracking-widest text-muted-foreground">
          From
        </Label>
        <Input
          id="filter-from"
          type="date"
          value={filters.from}
          onChange={(e) => update({ from: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to" className="text-xs uppercase tracking-widest text-muted-foreground">
          To
        </Label>
        <Input
          id="filter-to"
          type="date"
          value={filters.to}
          onChange={(e) => update({ to: e.target.value })}
        />
      </div>

      <div className="lg:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
        <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-3 w-3" />
          Filters apply client-side
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
    </div>
  );
}

export default FilterBar;
