// Client directory derived from the invoices table.
//
// There is no dedicated `clients` table — a "client" is the set of invoices
// sharing a name. This keeps the data model flat (one table, scoped by
// `company`) while still letting us search clients, show a per-client profile,
// and remember a client's address for prefilling new invoices. All functions
// here are PURE so they can run on the server (server actions) and be unit-
// reasoned about; the Supabase fetch lives in `app/actions/clients.ts`.

import type { Invoice } from "@/lib/supabase/types";

export interface ClientCurrencyTotal {
  currency: string;
  /** Sum of `total` across this client's invoices in this currency. */
  billed: number;
  /** Sum of `total` for invoices marked `paid`. */
  paid: number;
  /** billed - paid (everything not yet settled). */
  outstanding: number;
  count: number;
}

export interface ClientSummary {
  /** Stable identity used in URLs and matching — lowercased, collapsed spaces. */
  key: string;
  /** Display name taken from the most recent invoice. */
  name: string;
  /** Most recent non-empty address — what we prefill on a new invoice. */
  address: string | null;
  /** Currency of the most recent invoice — prefilled alongside the address. */
  currency: string;
  invoiceCount: number;
  firstDate: string | null;
  lastDate: string | null;
  totals: ClientCurrencyTotal[];
}

/** Normalised identity for a client name. Empty string for blank/unknown. */
export function clientKey(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

const isPaid = (inv: Invoice) => inv.status === "paid";
const amountOf = (inv: Invoice) =>
  Number.isFinite(inv.total) ? inv.total : 0;

/**
 * Group invoices into client summaries, sorted by most recent activity.
 * Invoices with a blank client name are skipped.
 */
export function deriveClients(invoices: Invoice[]): ClientSummary[] {
  const groups = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const key = clientKey(inv.client_name);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(inv);
    else groups.set(key, [inv]);
  }

  const summaries: ClientSummary[] = [];
  for (const [key, list] of groups) {
    // Newest first so [0] is the "current" name / address / currency.
    const sorted = [...list].sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    );
    const latest = sorted[0];
    const address =
      sorted.find((i) => (i.client_address ?? "").trim().length > 0)
        ?.client_address ?? null;

    const totalsMap = new Map<string, ClientCurrencyTotal>();
    for (const inv of sorted) {
      const cur = (inv.currency || "USD").toUpperCase();
      const entry =
        totalsMap.get(cur) ??
        { currency: cur, billed: 0, paid: 0, outstanding: 0, count: 0 };
      const amt = amountOf(inv);
      entry.billed += amt;
      if (isPaid(inv)) entry.paid += amt;
      entry.count += 1;
      totalsMap.set(cur, entry);
    }
    for (const t of totalsMap.values()) {
      t.billed = round2(t.billed);
      t.paid = round2(t.paid);
      t.outstanding = round2(t.billed - t.paid);
    }

    summaries.push({
      key,
      name: latest.client_name,
      address,
      currency: (latest.currency || "USD").toUpperCase(),
      invoiceCount: sorted.length,
      lastDate: sorted[0]?.date ?? null,
      firstDate: sorted[sorted.length - 1]?.date ?? null,
      totals: [...totalsMap.values()].sort((a, b) =>
        a.currency.localeCompare(b.currency),
      ),
    });
  }

  return summaries.sort((a, b) =>
    (b.lastDate ?? "").localeCompare(a.lastDate ?? ""),
  );
}

export interface ClientProfile {
  summary: ClientSummary;
  invoices: Invoice[];
}

/** Resolve a single client profile by key, with its invoices (newest first). */
export function getClientProfile(
  invoices: Invoice[],
  key: string,
): ClientProfile | null {
  const target = clientKey(key);
  if (!target) return null;
  const summaries = deriveClients(invoices);
  const summary = summaries.find((c) => c.key === target);
  if (!summary) return null;
  const own = invoices
    .filter((inv) => clientKey(inv.client_name) === target)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { summary, invoices: own };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
