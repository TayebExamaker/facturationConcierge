"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Landmark, Loader2, LogOut, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn, SPRING_LAYOUT, SPRING_PANEL } from "@/components/motion/primitives";
import { PAYMENT_BLOCK } from "@/lib/company";
import { cn } from "@/lib/utils";
import { updatePaymentInstructions } from "@/app/actions/settings";
import { logoutAction } from "@/app/login/actions";

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
    <div className="space-y-5">
      <FadeIn className="luxury-card">
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <Landmark className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Payment Details</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Rendered in the “Payment Information” section of every invoice.
                Lines ending with “:” become section headings in the PDF.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue(PAYMENT_BLOCK)}
            disabled={isBuiltIn}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Built-in default</span>
            <span className="sm:hidden">Default</span>
          </button>
        </div>

        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={22}
            spellCheck={false}
            aria-label="Global payment details"
            className="font-mono text-xs leading-relaxed sm:text-xs"
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-secondary/50 p-3.5">
            <Switch checked={applyToExisting} onChange={setApplyToExisting} />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <span className="block text-sm font-medium text-foreground">
                Apply to existing invoices
              </span>
              Clears any per-invoice payment block so all past invoices show these
              details too. Turn off to keep invoices that were customised by hand.
            </span>
          </label>

          <div className="hidden items-center justify-end gap-3 sm:flex">
            <AnimatePresence>
              {dirty ? (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-1.5 text-xs text-amber-600"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </motion.span>
              ) : null}
            </AnimatePresence>
            <Button type="button" variant="gold" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save payment details
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08} className="luxury-card flex items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Session</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Signed in as authorized staff on this device.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            <LogOut />
            Sign out
          </Button>
        </form>
      </FadeIn>

      {/* Phone: floating save bar, only while there are unsaved edits. */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={SPRING_PANEL}
            className="fixed inset-x-3 bottom-[calc(var(--tabbar-height)+max(0.75rem,var(--safe-bottom))+0.6rem)] z-40 mx-auto max-w-md sm:hidden"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-foreground p-2 pl-4 text-background shadow-[0_18px_40px_-14px_rgba(15,23,42,0.6)]">
              <span className="flex-1 text-sm">Unsaved changes</span>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-background text-foreground hover:bg-background/90"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** iOS-style toggle with a spring thumb. */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={cn(
        "relative mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
        checked ? "justify-end bg-foreground" : "justify-start bg-slate-300",
      )}
    >
      <motion.span
        layout
        transition={SPRING_LAYOUT}
        className="h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.3)]"
      />
    </button>
  );
}

export default PaymentDetailsIsland;
