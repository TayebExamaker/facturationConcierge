"use client";

import * as React from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceFormShape } from "@/components/invoice/line-items";

export interface TotalsSummaryProps {
  register: UseFormRegister<InvoiceFormShape>;
  watch: UseFormWatch<InvoiceFormShape>;
  setValue: UseFormSetValue<InvoiceFormShape>;
  className?: string;
}

export interface ComputedTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function computeTotals(values: {
  items?: Array<{ quantity?: number; unit_price?: number }>;
  tax_rate?: number;
  discount?: number;
  shipping?: number;
}): ComputedTotals {
  const items = values.items ?? [];
  const subtotal = items.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unit_price) || 0;
    return acc + q * p;
  }, 0);
  const taxRate = Number(values.tax_rate) || 0;
  const discount = Number(values.discount) || 0;
  const shipping = Number(values.shipping) || 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const taxAmount = taxableBase * (taxRate / 100);
  const total = taxableBase + taxAmount + shipping;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export function TotalsSummary({
  register,
  watch,
  setValue,
  className,
}: TotalsSummaryProps) {
  const values = watch();
  const v = values as unknown as {
    currency?: string;
    discount?: number;
    shipping?: number;
    to_be_paid?: number;
    tax_rate?: number;
  };
  const currency = v.currency ?? "USD";
  const totals = computeTotals(values as Parameters<typeof computeTotals>[0]);

  // Progressive disclosure — discount/shipping rows appear only when added.
  const [showDiscount, setShowDiscount] = React.useState<boolean>(
    () => Number(v.discount) > 0,
  );
  const [showShipping, setShowShipping] = React.useState<boolean>(
    () => Number(v.shipping) > 0,
  );

  // Keep `to_be_paid` synced with `total` until the user types something.
  const userOverride = React.useRef<boolean>(false);
  const lastTotal = React.useRef<number>(totals.total);
  React.useEffect(() => {
    const current = Number(v.to_be_paid);
    const synced =
      current === undefined ||
      current === null ||
      Number.isNaN(current) ||
      current === lastTotal.current;
    if (!userOverride.current && synced) {
      setValue("to_be_paid" as never, totals.total as never, { shouldDirty: false });
    }
    lastTotal.current = totals.total;
  }, [totals.total, v.to_be_paid, setValue]);

  const removeDiscount = () => {
    setValue("discount" as never, 0 as never, { shouldDirty: true });
    setShowDiscount(false);
  };
  const removeShipping = () => {
    setValue("shipping" as never, 0 as never, { shouldDirty: true });
    setShowShipping(false);
  };
  const resetTax = () => {
    setValue("tax_rate" as never, 0 as never, { shouldDirty: true });
  };

  return (
    <div
      className={cn(
        // Full-width on phone, anchored right with sensible max width on tablet+.
        "luxury-card p-4 sm:p-6 w-full sm:ml-auto sm:max-w-md space-y-4",
        className,
      )}
    >
      {/* Sub-total */}
      <Row
        label="Sub-Total"
        value={<span className="tabular-nums font-medium">{formatMoney(totals.subtotal, currency)}</span>}
      />

      {/* Tax */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Tax</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("tax_rate" as never, { valueAsNumber: true })}
              className="h-10 w-24 pr-8 text-right tabular-nums"
              aria-label="Tax rate"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
          <button
            type="button"
            onClick={resetTax}
            aria-label="Reset tax"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Discount row (collapsed by default) */}
      {showDiscount ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Discount</span>
          <div className="flex items-center gap-2">
            <Input
              id="discount"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("discount" as never, { valueAsNumber: true })}
              className="h-10 w-32 text-right tabular-nums"
              aria-label="Discount amount"
            />
            <button
              type="button"
              onClick={removeDiscount}
              aria-label="Remove discount"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Shipping row (collapsed by default) */}
      {showShipping ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Shipping</span>
          <div className="flex items-center gap-2">
            <Input
              id="shipping"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("shipping" as never, { valueAsNumber: true })}
              className="h-10 w-32 text-right tabular-nums"
              aria-label="Shipping amount"
            />
            <button
              type="button"
              onClick={removeShipping}
              aria-label="Remove shipping"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Add chips */}
      {!showDiscount || !showShipping ? (
        <div className="flex items-center gap-4 -mt-1">
          {!showDiscount ? (
            <button
              type="button"
              onClick={() => setShowDiscount(true)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Discount
            </button>
          ) : null}
          {!showShipping ? (
            <button
              type="button"
              onClick={() => setShowShipping(true)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Shipping
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-border" />

      {/* Total */}
      <Row
        label="Total"
        emphasis
        value={
          <span className="tabular-nums font-semibold">
            {formatMoney(totals.total, currency)}
          </span>
        }
      />

      {/* To Be Paid override input */}
      <div className="flex items-center justify-end gap-3">
        <Label htmlFor="to_be_paid" className="sr-only">
          To be paid (override)
        </Label>
        <div className="relative">
          <Input
            id="to_be_paid"
            type="number"
            step="0.01"
            inputMode="decimal"
            {...register("to_be_paid" as never, {
              valueAsNumber: true,
              onChange: () => {
                userOverride.current = true;
              },
            })}
            className="h-11 w-full sm:w-44 pl-8 text-right tabular-nums font-medium"
            aria-label="Final amount to be paid"
          />
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {currencySymbol(currency)}
          </span>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Final balance */}
      <div className="flex items-end justify-between">
        <span className="text-base font-bold text-foreground">To Be Paid</span>
        <span className="text-xl font-bold tabular-nums text-foreground">
          {formatMoney(
            Number.isFinite(Number(v.to_be_paid)) ? Number(v.to_be_paid) : totals.total,
            currency,
          )}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          "text-sm",
          emphasis ? "text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className={cn(emphasis ? "text-base" : "text-sm")}>{value}</span>
    </div>
  );
}

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    JPY: "¥",
    CHF: "CHF",
    CAD: "$",
    AUD: "$",
    BTC: "₿",
    USDT: "₮",
    USDC: "$",
  };
  return map[code.toUpperCase()] ?? code.toUpperCase();
}

export default TotalsSummary;
