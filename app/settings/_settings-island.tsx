"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_BLOCK } from "@/lib/company";
import { updatePaymentInstructions } from "@/app/actions/settings";

export interface PaymentDetailsIslandProps {
  /** Current global block, server-fetched (app_settings, or the constant). */
  initialValue: string;
}

export function PaymentDetailsIsland({ initialValue }: PaymentDetailsIslandProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [applyToExisting, setApplyToExisting] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedValue, setSavedValue] = React.useState(initialValue);

  const dirty = value.trim() !== savedValue.trim();
  const isBuiltIn = value.trim() === PAYMENT_BLOCK.trim();

  async function handleSave() {
    if (!value.trim()) {
      toast.error("Payment details cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { updatedInvoices } = await updatePaymentInstructions(
        value,
        applyToExisting,
      );
      setSavedValue(value);
      toast.success(
        applyToExisting && updatedInvoices > 0
          ? `Payment details saved — ${updatedInvoices} existing invoice${
              updatedInvoices === 1 ? "" : "s"
            } re-linked.`
          : "Payment details saved — used by every invoice.",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="luxury-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Payment Details</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Rendered in the “Payment Information” section of every invoice.
            Lines ending with “:” become section headings in the PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setValue(PAYMENT_BLOCK)}
          disabled={isBuiltIn}
          className="shrink-0 text-[11px] uppercase tracking-widest text-gold hover:text-gold-400 disabled:opacity-40 disabled:hover:text-gold flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Built-in default
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={26}
          spellCheck={false}
          aria-label="Global payment details"
          className="font-mono text-xs leading-relaxed"
        />

        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={applyToExisting}
            onChange={(e) => setApplyToExisting(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-foreground"
          />
          <span>
            Apply to existing invoices — clears any per-invoice payment block so
            all past invoices show these details too. Uncheck to keep invoices
            that were customised by hand.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          {dirty ? (
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Unsaved changes
            </span>
          ) : null}
          <Button
            type="button"
            variant="gold"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save payment details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentDetailsIsland;
