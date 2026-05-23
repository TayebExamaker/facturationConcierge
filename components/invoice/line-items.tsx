"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Parse a free-text numeric input into a Number. Tolerant of `,` decimal
 * separator (FR/EU keyboards) and incidental whitespace. Returns `0` for
 * empty / unparseable values so the form math stays defined.
 */
function toNumberLoose(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).trim().replace(",", ".");
  if (cleaned === "" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface InvoiceLineFormValue {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceFormShape {
  currency: string;
  items: InvoiceLineFormValue[];
  [key: string]: unknown;
}

export interface LineItemsProps {
  control: Control<InvoiceFormShape>;
  register: UseFormRegister<InvoiceFormShape>;
  watch: UseFormWatch<InvoiceFormShape>;
  className?: string;
}

export function LineItems({ control, register, watch, className }: LineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items" as never,
  });
  // Subscribe ONLY to currency. Per-row amount is computed inside each row via
  // a scoped useWatch so a keystroke in row #2 doesn't re-render row #1's
  // inputs (which on iOS PWA was eating the keystroke).
  const currency = watch("currency") ?? "USD";

  const handleAdd = () => {
    append({ description: "", quantity: 1, unit_price: 0 });
  };

  const isEmpty = fields.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile layout (<sm) — cards stacked vertically. */}
      <div className="space-y-3 sm:hidden">
        {isEmpty ? (
          <div className="luxury-card p-6 text-center text-sm text-muted-foreground">
            No line items yet — tap{" "}
            <span className="text-foreground">Add row</span>.
          </div>
        ) : (
          fields.map((field, index) => (
            <MobileLineCard
              key={field.id}
              index={index}
              control={control}
              register={register}
              currency={currency as string}
              onRemove={() => remove(index)}
            />
          ))
        )}
      </div>

      {/* Desktop / tablet layout (sm+) — table. */}
      <div className="hidden sm:block overflow-x-auto luxury-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[45%] min-w-[200px]">Description</TableHead>
              <TableHead className="text-right w-[15%] min-w-[90px]">Qty</TableHead>
              <TableHead className="text-right w-[18%] min-w-[110px]">Unit Price</TableHead>
              <TableHead className="text-right w-[18%] min-w-[100px]">Amount</TableHead>
              <TableHead className="w-[4%]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-6 text-sm text-muted-foreground"
                >
                  No line items yet — click{" "}
                  <span className="text-foreground">Add row</span> to begin.
                </TableCell>
              </TableRow>
            ) : null}

            {fields.map((field, index) => (
              <DesktopLineRow
                key={field.id}
                index={index}
                control={control}
                register={register}
                currency={currency as string}
                onRemove={() => remove(index)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="h-11 sm:h-9 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      </div>
    </div>
  );
}

interface LineRowProps {
  index: number;
  control: Control<InvoiceFormShape>;
  register: UseFormRegister<InvoiceFormShape>;
  currency: string;
  onRemove: () => void;
}

/**
 * Mobile-only stacked card row. Scoped `useWatch` means only this row
 * re-renders when its own qty/price change — sibling rows stay quiet,
 * preserving input focus and accepted keystrokes on iOS Safari PWA.
 */
const MobileLineCard = React.memo(function MobileLineCard({
  index,
  control,
  register,
  currency,
  onRemove,
}: LineRowProps) {
  const qty = useWatch({ control, name: `items.${index}.quantity` as never });
  const price = useWatch({ control, name: `items.${index}.unit_price` as never });
  const amount = (Number(qty) || 0) * (Number(price) || 0);

  return (
    <div className="luxury-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Item {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove line ${index + 1}`}
          className="-mr-2 -mt-1"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <Textarea
        {...register(`items.${index}.description` as const)}
        placeholder="Service description"
        className="min-h-[44px] resize-y"
        rows={2}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Quantity
          </label>
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            {...register(`items.${index}.quantity` as const, {
              setValueAs: toNumberLoose,
            })}
            className="text-right tabular-nums h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Unit price
          </label>
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            {...register(`items.${index}.unit_price` as const, {
              setValueAs: toNumberLoose,
            })}
            className="text-right tabular-nums h-11"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Amount
        </span>
        <span className="font-semibold tabular-nums">
          {formatMoney(amount, currency)}
        </span>
      </div>
    </div>
  );
});

/**
 * Desktop table-row variant. Same scoped useWatch pattern — kept identical
 * to mobile so both layouts behave consistently and only the affected row
 * re-renders on input.
 */
const DesktopLineRow = React.memo(function DesktopLineRow({
  index,
  control,
  register,
  currency,
  onRemove,
}: LineRowProps) {
  const qty = useWatch({ control, name: `items.${index}.quantity` as never });
  const price = useWatch({ control, name: `items.${index}.unit_price` as never });
  const amount = (Number(qty) || 0) * (Number(price) || 0);

  return (
    <TableRow className="align-top">
      <TableCell>
        <Textarea
          {...register(`items.${index}.description` as const)}
          placeholder="Service description"
          className="min-h-[40px] resize-y"
          rows={1}
          autoComplete="off"
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          {...register(`items.${index}.quantity` as const, {
            setValueAs: toNumberLoose,
          })}
          className="text-right tabular-nums"
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          {...register(`items.${index}.unit_price` as const, {
            setValueAs: toNumberLoose,
          })}
          className="text-right tabular-nums"
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(amount, currency)}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove line ${index + 1}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

export default LineItems;
