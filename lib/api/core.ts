// Public read-only REST API (/api/v1/*) — shared helpers.
//
// Auth: a static API key from the CRM_API_KEY env var (comma-separate several
// keys to rotate without downtime). Sent as `Authorization: Bearer <key>` or
// `X-API-Key: <key>`. The middleware does NOT gate /api/v1 with the session
// cookie — this key is the only gate, so every route must call `guard()`.
//
// Data: a plain supabase-js client (no cookies) scoped to COMPANY_KEY. Rows
// are serialised through `toApiInvoice`, which deliberately leaves out the
// bank-details block (`payment_instructions`).

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { COMPANY_KEY } from "@/lib/company";
import { isCreditNote, signedTotal } from "@/lib/credit-note";
import type { Database, Invoice } from "@/lib/supabase/types";

// ---------- HTTP ----------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
  "Cache-Control": "no-store",
};

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Constant-time string comparison (length leak only). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function configuredKeys(): string[] {
  return (process.env.CRM_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 24);
}

/** Key sent as `Authorization: Bearer` or `X-API-Key`, or "" when absent. */
export function keyFromHeaders(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  return bearer || (req.headers.get("x-api-key") ?? "").trim();
}

/**
 * Checks a provided key. "disabled" when no key is configured server-side.
 * Shared by the REST API (header) and the MCP endpoint (header or URL path).
 */
export function checkKey(provided: string): "ok" | "invalid" | "disabled" {
  const keys = configuredKeys();
  if (keys.length === 0) return "disabled";
  if (!provided || !keys.some((k) => safeEqual(k, provided))) return "invalid";
  return "ok";
}

/**
 * Returns an error response when the request is not authorised, `null` when
 * it may proceed. Usage: `const denied = guard(req); if (denied) return denied;`
 */
export function guard(req: Request): NextResponse | null {
  const verdict = checkKey(keyFromHeaders(req));
  if (verdict === "disabled") {
    return apiError(
      503,
      "api_disabled",
      "API disabled: set CRM_API_KEY (≥24 chars) in the server environment.",
    );
  }
  if (verdict === "invalid") {
    return apiError(401, "unauthorized", "Missing or invalid API key.");
  }
  return null;
}

// ---------- Data ----------

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Every document (invoices + credit notes) of the company, newest first. */
export async function fetchAllDocuments(): Promise<Invoice[]> {
  const supabase = db();
  const PAGE = 1000; // PostgREST max rows per request
  const out: Invoice[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("company", COMPANY_KEY)
      .order("date", { ascending: false })
      .order("invoice_number", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Invoice[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

// ---------- Serialisation ----------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Unpaid = anything not marked paid. Drafts count: in practice invoices are
 * issued without being moved to "sent", and the dashboard's Outstanding KPI
 * treats them the same way — the API must agree with it. Documents whose
 * balance is already 0 (fully prepaid) are not unpaid.
 */
export function isUnpaid(inv: Invoice): boolean {
  // A draft whose balance is already 0 (prepaid, "Amount paid" = total) is settled.
  return inv.status !== "paid" && amountDue(inv) !== 0;
}

/** What the client still owes on this document (signed: credit notes < 0). */
export function amountDue(inv: Invoice): number {
  if (inv.status === "paid") return 0;
  const raw = Number(inv.to_be_paid ?? inv.total ?? 0);
  const n = Number.isFinite(raw) ? raw : 0;
  return round2(isCreditNote(inv) ? -n : n);
}

function daysSince(isoDate: string, today: Date): number | null {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86_400_000));
}

export function toApiInvoice(inv: Invoice, today = new Date()) {
  const creditNote = isCreditNote(inv);
  return {
    id: inv.id,
    number: inv.invoice_number,
    label: inv.label,
    type: creditNote ? "credit_note" : "invoice",
    status: inv.status,
    client: { name: inv.client_name, address: inv.client_address },
    date: inv.date,
    days_since_issue: isUnpaid(inv) ? daysSince(inv.date, today) : null,
    currency: (inv.currency || "USD").toUpperCase(),
    items: (inv.items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      amount: Number(it.amount),
    })),
    subtotal: Number(inv.subtotal),
    tax_rate: Number(inv.tax_rate),
    tax_amount: Number(inv.tax_amount),
    discount: Number(inv.discount),
    shipping: Number(inv.shipping),
    total: Number(inv.total),
    /** Total with its book sign (credit notes negative). */
    signed_total: round2(signedTotal(inv)),
    /** Already received, deducted on the invoice ("Amount paid" line). */
    amount_paid: creditNote
      ? 0
      : round2(Math.max(0, Number(inv.total) - Number(inv.to_be_paid ?? inv.total))),
    /** Balance the client still owes (0 once status is paid). */
    amount_due: amountDue(inv),
    payment_terms: inv.payment_terms,
    po_number: inv.po_number,
    notes: inv.notes,
    pdf_url: inv.pdf_url,
    credited_invoice_number: creditNote ? inv.credited_invoice_number ?? null : null,
    source: inv.source,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
  };
}

export type ApiInvoice = ReturnType<typeof toApiInvoice>;

/** Per-currency money totals. Never sums across currencies. */
export function summarize(docs: Invoice[]) {
  type Row = {
    currency: string;
    invoiced: number;
    paid: number;
    unpaid: number;
    overdue: number;
    invoice_count: number;
    paid_count: number;
    unpaid_count: number;
    overdue_count: number;
  };
  const map = new Map<string, Row>();
  for (const inv of docs) {
    const cur = (inv.currency || "USD").toUpperCase();
    const r =
      map.get(cur) ??
      { currency: cur, invoiced: 0, paid: 0, unpaid: 0, overdue: 0, invoice_count: 0, paid_count: 0, unpaid_count: 0, overdue_count: 0 };
    const signed = signedTotal(inv);
    const counts = !isCreditNote(inv);
    r.invoiced += signed;
    if (counts) r.invoice_count += 1;
    if (inv.status === "paid") {
      r.paid += signed;
      if (counts) r.paid_count += 1;
    }
    if (isUnpaid(inv)) {
      r.unpaid += amountDue(inv);
      if (counts) r.unpaid_count += 1;
    }
    if (inv.status === "overdue") {
      r.overdue += amountDue(inv);
      if (counts) r.overdue_count += 1;
    }
    map.set(cur, r);
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      invoiced: round2(r.invoiced),
      paid: round2(r.paid),
      unpaid: round2(r.unpaid),
      overdue: round2(r.overdue),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

// ---------- Query params ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["draft", "sent", "paid", "overdue"]);

export type ListParams = {
  status?: string[];
  currency?: string;
  client?: string;
  from?: string;
  to?: string;
  type?: "invoice" | "credit_note";
  unpaid?: boolean;
  limit: number;
  offset: number;
};

/** Parses list filters; returns a string error message on bad input. */
export function parseListParams(url: URL): ListParams | string {
  const p = url.searchParams;
  const status = p.get("status")?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (status?.some((s) => !STATUSES.has(s))) {
    return "status must be one or more of: draft, sent, paid, overdue";
  }
  const from = p.get("from") ?? undefined;
  const to = p.get("to") ?? undefined;
  if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to))) {
    return "from / to must be YYYY-MM-DD";
  }
  const type = p.get("type") ?? undefined;
  if (type && type !== "invoice" && type !== "credit_note") {
    return "type must be invoice or credit_note";
  }
  const limit = Number(p.get("limit") ?? 100);
  const offset = Number(p.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) return "limit must be 1–500";
  if (!Number.isInteger(offset) || offset < 0) return "offset must be ≥ 0";
  const unpaid = p.get("unpaid");
  return {
    status: status?.length ? status : undefined,
    currency: p.get("currency")?.toUpperCase() || undefined,
    client: p.get("client")?.trim().toLowerCase() || undefined,
    from,
    to,
    type: type as ListParams["type"],
    unpaid: unpaid === "true" || unpaid === "1",
    limit,
    offset,
  };
}

export function applyFilters(docs: Invoice[], f: ListParams): Invoice[] {
  return docs.filter((inv) => {
    if (f.status && !f.status.includes(inv.status)) return false;
    if (f.unpaid && !isUnpaid(inv)) return false;
    if (f.currency && (inv.currency || "USD").toUpperCase() !== f.currency) return false;
    if (f.client && !(inv.client_name ?? "").toLowerCase().includes(f.client)) return false;
    if (f.from && inv.date < f.from) return false;
    if (f.to && inv.date > f.to) return false;
    if (f.type && (isCreditNote(inv) ? "credit_note" : "invoice") !== f.type) return false;
    return true;
  });
}

/** Wraps a handler: auth + uniform 500s. */
export function handler(
  fn: (req: Request, ctx: { params: Record<string, string> }) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: { params: Record<string, string> }) => {
    const denied = guard(req);
    if (denied) return denied;
    try {
      return await fn(req, ctx);
    } catch (e) {
      console.error("[api/v1]", e);
      return apiError(500, "internal_error", "Unexpected server error.");
    }
  };
}
