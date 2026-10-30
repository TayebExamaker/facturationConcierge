"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Download, Loader2, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPRING_LAYOUT } from "@/components/motion/primitives";
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
  /** Invoice count per status (plus `all`) — shown inside the status chips. */
  counts?: Record<string, number>;
  /** Currencies present in the data; falls back to the full list. */
  currencies?: string[];
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
] as const;

const EMPTY: FilterValues = { status: "all", currency: "all", client: "", from: "", to: "" };

export function FilterBar({ value, onChange, counts, currencies, className }: FilterBarProps) {
  const [filters, setFilters] = React.useState<FilterValues>({
    status: value?.status ?? "all",
    currency: value?.currency ?? "all",
    client: value?.client ?? "",
    from: value?.from ?? "",
    to: value?.to ?? "",
  });
  const [exporting, setExporting] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const currencyCodes = React.useMemo(
    () => (currencies && currencies.length > 0 ? currencies : CURRENCIES.map((c) => c.code)),
    [currencies],
  );

  const update = (patch: Partial<FilterValues>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      onChange?.(next);
      return next;
    });
  };

  // Filters hidden behind the mobile "Filters" button.
  const advancedCount =
    (filters.currency !== "all" ? 1 : 0) + (filters.from ? 1 : 0) + (filters.to ? 1 : 0);

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

      // Prepend UTF-8 BOM so Excel on Windows decodes accented characters
      // (client names, currency symbols) instead of mojibake.
      const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
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
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-client"
            type="search"
            placeholder="Search clients"
            aria-label="Search client name"
            className="pl-10 pr-9"
            value={filters.client}
            onChange={(e) => update({ client: e.target.value })}
          />
          {filters.client ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => update({ client: "" })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Desktop: inline advanced filters */}
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <Select value={filters.currency} onValueChange={(v) => update({ currency: v })}>
            <SelectTrigger className="w-32" aria-label="Currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              {currencyCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From date"
            className="w-[9.5rem]"
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="To date"
            className="w-[9.5rem]"
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
          />
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            CSV
          </Button>
        </div>

        {/* Mobile: filters live in a bottom sheet */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setSheetOpen(true)}
          aria-label="Open filters"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:h-10 sm:w-10 xl:hidden"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {advancedCount > 0 ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background"
            >
              {advancedCount}
            </motion.span>
          ) : null}
        </motion.button>
      </div>

      <StatusChips value={filters.status} counts={counts} onChange={(status) => update({ status })} />

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filters"
        description="Narrow the list and export what you see."
      >
        <div className="space-y-6 pt-2">
          <div className="space-y-2.5">
            <Label className="eyebrow">Currency</Label>
            <div className="flex flex-wrap gap-2">
              {["all", ...currencyCodes].map((code) => {
                const active = filters.currency === code;
                return (
                  <motion.button
                    key={code}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => update({ currency: code })}
                    className={cn(
                      "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    {code === "all" ? "All" : code}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sheet-from" className="eyebrow">
                From
              </Label>
              <Input
                id="sheet-from"
                type="date"
                value={filters.from}
                onChange={(e) => update({ from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sheet-to" className="eyebrow">
                To
              </Label>
              <Input
                id="sheet-to"
                type="date"
                value={filters.to}
                onChange={(e) => update({ to: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => update({ ...EMPTY, client: filters.client, status: filters.status })}
              disabled={advancedCount === 0}
            >
              <RotateCcw />
              Reset
            </Button>
            <Button variant="outline" size="lg" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              Export CSV
            </Button>
          </div>
          <Button variant="gold" size="lg" className="w-full" onClick={() => setSheetOpen(false)}>
            Show results
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

/** Horizontally scrollable segmented status control with a gliding pill. */
function StatusChips({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts?: Record<string, number>;
  onChange: (status: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {STATUS_OPTIONS.map((o) => {
        const active = value === o.value;
        const count = counts?.[o.value];
        return (
          <motion.button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              active ? "text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="status-chip"
                transition={SPRING_LAYOUT}
                className="absolute inset-0 rounded-full bg-foreground shadow-[0_6px_16px_-8px_rgba(15,23,42,0.7)]"
              />
            ) : (
              <span className="absolute inset-0 rounded-full border border-border bg-card" />
            )}
            <span className="relative">{o.label}</span>
            {typeof count === "number" ? (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[11px] tabular-nums",
                  active ? "bg-white/15 text-white" : "bg-secondary text-muted-foreground",
                )}
              >
                {count}
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

export default FilterBar;
