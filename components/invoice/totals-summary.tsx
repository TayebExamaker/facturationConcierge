"use client";

import * as React from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toNumberLoose, type InvoiceFormShape } from "@/components/invoice/line-items";

export interface TotalsSummaryProps {
  register: UseFormRegister<InvoiceFormShape>;
  control: Control<InvoiceFormShape>;
  /** Retained for API back-compat; not used internally — scoped useWatch is used instead. */
  watch?: UseFormWatch<InvoiceFormShape>;
  setValue: UseFormSetValue<InvoiceFormShape>;
  className?: string;
}

export interface ComputedTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function computeTotals(values: {
  items?: Array<{ quantity?: number | string; unit_price?: number | string }>;
  tax_rate?: number | string;
  discount?: number | string;
  shipping?: number | string;
}): ComputedTotals {
  const items = values.items ?? [];
  const subtotal = items.reduce((acc, item) => {
    return acc + toNumberLoose(item.quantity) * toNumberLoose(item.unit_price);
  }, 0);
  const taxRate = toNumberLoose(values.tax_rate);
  const discount = toNumberLoose(values.discount);
  const shipping = toNumberLoose(values.shipping);
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
  control,
  setValue,
  className,
}: TotalsSummaryProps) {
  // Scoped subscriptions — bare `watch()` here would force this whole subtree
  // (including the tax / discount / shipping inputs) to re-render on every
  // form-state change, churning input refs and dropping keystrokes. We pull
  // the six paths we actually need and let everything else re-render on its
  // own schedule.
  const items = useWatch({ control, name: "items" as never }) as unknown as
    | Array<{ quantity?: number | string; unit_price?: number | string }>
    | undefined;
  const taxRateW = useWatch({ control, name: "tax_rate" as never }) as unknown as
    | number
    | string
    | undefined;
  const discountW = useWatch({ control, name: "discount" as never }) as unknown as
    | number
    | string
    | undefined;
  const shippingW = useWatch({ control, name: "shipping" as never }) as unknown as
    | number
    | string
    | undefined;
  const toBePaidW = useWatch({ control, name: "to_be_paid" as never }) as unknown as
    | number
    | string
    | undefined;
  const currencyW =
    ((useWatch({ control, name: "currency" as never }) as unknown) as string | undefined) ??
    "USD";

  const currency = currencyW;
  const totals = computeTotals({
    items,
    tax_rate: taxRateW,
    discount: discountW,
    shipping: shippingW,
  });

  // Progressive disclosure — discount/shipping rows appear only when added.
  const [showDiscount, setShowDiscount] = React.useState<boolean>(
    () => Number(discountW) > 0,
  );
  const [showShipping, setShowShipping] = React.useState<boolean>(
    () => Number(shippingW) > 0,
  );

  // Amount already paid (deposit, partial payment). Not a stored column:
  // it lives as `to_be_paid = total - paid`, so the PDF and preview derive it
  // back the same way. Seeded from an existing invoice whose to_be_paid < total.
  const [paidInput, setPaidInput] = React.useState<string>(() => {
    const tbp = Number(toBePaidW);
    const paid = Number.isFinite(tbp) ? totals.total - tbp : 0;
    return paid > 0.005 ? String(Number(paid.toFixed(2))) : "";
  });
  const [showPaid, setShowPaid] = React.useState<boolean>(() => paidInput !== "");
  const paid = showPaid ? toNumberLoose(paidInput) : 0;

  // Keep `to_be_paid` synced with `total` until the user types something.
  const userOverride = React.useRef<boolean>(false);
  const lastTotal = React.useRef<number>(totals.total);
  React.useEffect(() => {
    if (showPaid) {
      // Amount paid drives the balance; follow line-item edits too.
      const balance = Number(Math.max(0, totals.total - paid).toFixed(2));
      if (Number(toBePaidW) !== balance) {
        setValue("to_be_paid" as never, balance as never, { shouldDirty: true });
      }
      lastTotal.current = totals.total;
      return;
    }
    const current = Number(toBePaidW);
    const synced =
      toBePaidW === undefined ||
      toBePaidW === null ||
      Number.isNaN(current) ||
      current === lastTotal.current;
    if (!userOverride.current && synced) {
      setValue("to_be_paid" as never, totals.total as never, { shouldDirty: false });
    }
    lastTotal.current = totals.total;
  }, [totals.total, toBePaidW, setValue, showPaid, paid]);

  const removePaid = () => {
    setShowPaid(false);
    setPaidInput("");
    userOverride.current = false;
    setValue("to_be_paid" as never, totals.total as never, { shouldDirty: true });
  };

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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              {...register("tax_rate" as never)}
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              {...register("discount" as never)}
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              {...register("shipping" as never)}
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
      {!showDiscount || !showShipping || !showPaid ? (
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
          {!showPaid ? (
            <button
              type="button"
              onClick={() => setShowPaid(true)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Amount paid
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

      {/* Amount already paid — deducted from the total */}
      {showPaid ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Amount paid</span>
          <div className="flex items-center gap-2">
            <Input
              id="amount_paid"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus={paidInput === ""}
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              className="h-10 w-32 text-right tabular-nums"
              aria-label="Amount already paid"
            />
            <button
              type="button"
              onClick={removePaid}
              aria-label="Remove amount paid"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* To Be Paid override input */}
      <div className={cn("flex items-center justify-end gap-3", showPaid && "hidden")}>
        <Label htmlFor="to_be_paid" className="sr-only">
          To be paid (override)
        </Label>
        <div className="relative">
          <Input
            id="to_be_paid"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            {...register("to_be_paid" as never, {
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
        <span className="text-base font-bold text-foreground">
          {showPaid && paid > 0 ? "Balance Due" : "To Be Paid"}
        </span>
        <span className="text-xl font-bold tabular-nums text-foreground">
          {formatMoney(
            Number.isFinite(Number(toBePaidW)) ? Number(toBePaidW) : totals.total,
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
