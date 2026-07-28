"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_KEY, PAYMENT_BLOCK } from "@/lib/company";

/**
 * The global payment block used by every invoice that has no per-invoice
 * override. Falls back to the PAYMENT_BLOCK constant when the settings row (or
 * the whole table, on a database that hasn't run 0005 yet) is missing — the app
 * must never render an empty "Payment Information" section.
 */
export async function getPaymentInstructions(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("payment_instructions")
    .eq("company", COMPANY_KEY)
    .maybeSingle();

  if (error) return PAYMENT_BLOCK;
  const stored = (data as { payment_instructions: string | null } | null)
    ?.payment_instructions;
  return stored && stored.trim() ? stored : PAYMENT_BLOCK;
}

/** True when the stored block differs from the built-in constant. */
export async function isPaymentInstructionsCustomized(): Promise<boolean> {
  const current = await getPaymentInstructions();
  return current.trim() !== PAYMENT_BLOCK.trim();
}

/**
 * Save the global payment block.
 *
 * `applyToExisting` clears every per-invoice override for this company so old
 * invoices fall back to the new block too — that's the "change it once, it
 * changes everywhere" behaviour. Leaving it false only affects invoices that
 * never had an override (all of them, unless one was edited by hand).
 */
export async function updatePaymentInstructions(
  text: string,
  applyToExisting = true
): Promise<{ updatedInvoices: number }> {
  const value = text.trim();
  if (!value) throw new Error("Payment details cannot be empty.");

  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    // supabase-js v2.45 inference is brittle on this schema — cast to bypass.
    .upsert({ company: COMPANY_KEY, payment_instructions: value } as never, {
      onConflict: "company",
    });
  if (error) {
    throw new Error(`Failed to save payment details: ${error.message}`);
  }

  let updatedInvoices = 0;
  if (applyToExisting) {
    const { data, error: clearError } = await supabase
      .from("invoices")
      .update({ payment_instructions: null } as never)
      .eq("company", COMPANY_KEY)
      .not("payment_instructions", "is", null)
      .select("id");
    if (clearError) {
      throw new Error(
        `Payment details saved, but existing invoices could not be re-linked: ${clearError.message}`
      );
    }
    updatedInvoices = (data as Array<{ id: string }> | null)?.length ?? 0;
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  return { updatedInvoices };
}

/** Restore the built-in PAYMENT_BLOCK as the global block. */
export async function resetPaymentInstructions(): Promise<{
  updatedInvoices: number;
  value: string;
}> {
  const { updatedInvoices } = await updatePaymentInstructions(PAYMENT_BLOCK, true);
  return { updatedInvoices, value: PAYMENT_BLOCK };
}
