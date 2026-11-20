// MCP server (Model Context Protocol) — lets Claude read invoices and record
// payments against them. Served by app/api/mcp/** over Streamable HTTP in
// stateless JSON mode: every POST carries one JSON-RPC message (or a batch)
// and gets a plain JSON response — no sessions, no SSE, so it runs as an
// ordinary Vercel function.
//
// Scope is deliberately narrow: read everything, write only `record_payment`
// and `set_invoice_status`. No create / delete / edit of invoice content.

import { revalidatePath } from "next/cache";

import { COMPANY_KEY } from "@/lib/company";
import { isCreditNote } from "@/lib/credit-note";
import { clientKey, deriveClients, getClientProfile } from "@/lib/clients";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/types";
import {
  amountDue,
  applyFilters,
  db,
  fetchAllDocuments,
  isUnpaid,
  parseListParams,
  summarize,
  toApiInvoice,
} from "@/lib/api/core";

const SERVER_INFO = { name: "concierge-one-invoicing", version: "1.0.0" };
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `Invoicing data of CONCIERGE ONE GROUP LTD (luxury concierge).
- Money is per currency; never add amounts in different currencies together.
- "Unpaid" = status is not "paid" and amount_due is not 0 (most invoices are left in "draft" after being issued, so draft does NOT mean unsent).
- amount_due = what the client still owes; amount_paid = already received and deducted on the invoice.
- Credit notes (type "credit_note") count negative.
- To reconcile a bank payment: call find_invoices_for_payment, show the candidates to the user, and only call record_payment once the user has confirmed which invoice(s) it settles.
- Writes are limited to record_payment, record_payments (batch) and set_invoice_status. Always confirm with the user before writing.`;

// ---------- JSON-RPC plumbing ----------

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

/** Thrown inside a tool: reported to the model as a tool error (isError). */
class ToolError extends Error {}

const ok = (id: JsonRpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: JsonRpcId, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

/**
 * Handles one parsed JSON-RPC payload. Returns the response body, or `null`
 * when nothing must be sent back (notifications only → HTTP 202).
 */
export async function handleMcpPayload(payload: unknown): Promise<unknown | null> {
  if (Array.isArray(payload)) {
    const out = (await Promise.all(payload.map(handleOne))).filter((r) => r !== null);
    return out.length ? out : null;
  }
  return handleOne(payload);
}

async function handleOne(msg: unknown): Promise<unknown | null> {
  const req = msg as JsonRpcRequest;
  if (!req || typeof req !== "object" || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return fail(null, -32600, "Invalid Request");
  }
  const isNotification = req.id === undefined;
  const id = req.id ?? null;
  try {
    const result = await dispatch(req.method, req.params ?? {});
    return isNotification ? null : ok(id, result);
  } catch (e) {
    if (isNotification) return null;
    if (e instanceof RpcError) return fail(id, e.code, e.message);
    console.error("[mcp]", e);
    return fail(id, -32603, "Internal error");
  }
}

async function dispatch(method: string, params: Record<string, unknown>) {
  switch (method) {
    case "initialize": {
      const requested = String(params.protocolVersion ?? "");
      return {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested)
          ? requested
          : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      };
    }
    case "ping":
      return {};
    case "notifications/initialized":
    case "notifications/cancelled":
      return {};
    case "tools/list":
      return { tools: TOOLS.map(({ run: _run, ...def }) => def) };
    case "tools/call": {
      const name = String(params.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) throw new RpcError(-32602, `Unknown tool: ${name}`);
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const data = await tool.run(args);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        };
      } catch (e) {
        if (e instanceof ToolError) {
          return { content: [{ type: "text", text: e.message }], isError: true };
        }
        throw e;
      }
    }
    case "resources/list":
      return { resources: [] };
    case "prompts/list":
      return { prompts: [] };
    default:
      throw new RpcError(-32601, `Method not found: ${method}`);
  }
}

// ---------- Helpers ----------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown, field: string): number {
  const n = typeof v === "string" ? Number(v.replace(/[\s,]/g, "")) : Number(v);
  if (!Number.isFinite(n)) throw new ToolError(`${field} must be a number`);
  return n;
}

function invoiceNumber(v: unknown): number {
  const n = Number(String(v ?? "").replace(/^#/, ""));
  if (!Number.isInteger(n) || n <= 0) throw new ToolError("invoice_number must be an integer, e.g. 3398");
  return n;
}

async function loadByNumber(n: number): Promise<Invoice> {
  const { data, error } = await db()
    .from("invoices")
    .select("*")
    .eq("company", COMPANY_KEY)
    .eq("invoice_number", n)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ToolError(`No invoice #${n}.`);
  return data as Invoice;
}

async function updateInvoice(inv: Invoice, patch: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await db()
    .from("invoices")
    .update(patch as never)
    .eq("id", inv.id)
    .eq("company", COMPANY_KEY)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  try {
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${inv.id}`);
  } catch {
    // revalidation is best-effort
  }
  return data as Invoice;
}

/** Loose name match: every word of `needle` appears in `hay`. */
function nameMatches(hay: string, needle: string): boolean {
  const h = clientKey(hay);
  return clientKey(needle)
    .split(" ")
    .filter((w) => w.length > 1)
    .every((w) => h.includes(w));
}

/** Compact line for lists (keeps tool output small for the model). */
function brief(inv: Invoice, today = new Date()) {
  const a = toApiInvoice(inv, today);
  return {
    number: a.number,
    type: a.type,
    status: a.status,
    client: a.client.name,
    date: a.date,
    days_since_issue: a.days_since_issue,
    currency: a.currency,
    total: a.total,
    amount_paid: a.amount_paid,
    amount_due: a.amount_due,
    items: a.items.map((i) => i.description.replace(/\s+/g, " ").trim()).join(" | ").slice(0, 160),
  };
}

/** Shared by record_payment and record_payments. Throws ToolError on refusal. */
async function applyPayment(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const inv = await loadByNumber(invoiceNumber(args.invoice_number));
  if (isCreditNote(inv)) throw new ToolError(`#${inv.invoice_number} is a credit note; use set_invoice_status "paid" to mark it refunded.`);
  if (inv.status === "paid") throw new ToolError(`#${inv.invoice_number} is already marked paid.`);
  const currency = str(args.currency)?.toUpperCase();
  const invCur = (inv.currency || "USD").toUpperCase();
  if (currency !== invCur) throw new ToolError(`Currency mismatch: invoice #${inv.invoice_number} is in ${invCur}, payment in ${currency}. Convert first or record it manually.`);
  const amount = round2(num(args.amount, "amount"));
  if (amount <= 0) throw new ToolError("amount must be positive");

  const due = amountDue(inv);
  // Small shortfalls (bank fees) still settle the invoice.
  const feeTolerance = Math.max(1, due * 0.01);
  if (amount > due + feeTolerance) {
    throw new ToolError(`Payment ${amount} ${invCur} exceeds the amount due on #${inv.invoice_number} (${due} ${invCur}). Split it across invoices.`);
  }

  const before = toApiInvoice(inv);
  let updated: Invoice;
  let outcome: string;
  if (amount >= due - feeTolerance) {
    updated = await updateInvoice(inv, { status: "paid" });
    outcome = amount < due ? `marked paid (short by ${round2(due - amount)} ${invCur}, treated as bank fees)` : "marked paid";
  } else {
    const newDue = round2(Number(inv.to_be_paid ?? inv.total) - amount);
    updated = await updateInvoice(inv, { to_be_paid: newDue });
    outcome = `partial payment recorded, ${newDue} ${invCur} still due`;
  }
  return {
    outcome,
    payment: { amount, currency: invCur, date: str(args.payment_date) ?? null, reference: str(args.reference) ?? null },
    before: { status: before.status, amount_paid: before.amount_paid, amount_due: before.amount_due },
    after: brief(updated),
  };
}

// ---------- Tools ----------

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

const READ = { readOnlyHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const STATUS_ENUM = ["draft", "sent", "paid", "overdue"];

const TOOLS: Tool[] = [
  {
    name: "get_summary",
    title: "Invoicing summary",
    description:
      "Totals per currency: invoiced, paid, unpaid (outstanding), overdue, with counts. Start here for any 'how much is owed' question.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ,
    run: async () => ({ by_currency: summarize(await fetchAllDocuments()) }),
  },
  {
    name: "list_unpaid",
    title: "Unpaid invoices",
    description:
      "Every invoice not marked paid, oldest first, with amount_due and days since issue. Optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Client name (partial match)" },
        currency: { type: "string", description: "ISO code, e.g. EUR" },
        min_days: { type: "integer", description: "Only invoices issued at least N days ago" },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 100 },
      },
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => {
      const client = str(args.client);
      const currency = str(args.currency)?.toUpperCase();
      const minDays = args.min_days == null ? 0 : num(args.min_days, "min_days");
      const limit = Math.min(500, Math.max(1, Number(args.limit ?? 100) || 100));
      const today = new Date();
      const rows = (await fetchAllDocuments())
        .filter(isUnpaid)
        .filter((i) => !client || nameMatches(i.client_name, client))
        .filter((i) => !currency || (i.currency || "USD").toUpperCase() === currency)
        .map((i) => brief(i, today))
        .filter((b) => (b.days_since_issue ?? 0) >= minDays)
        .sort((a, b) => a.date.localeCompare(b.date));
      const totals = new Map<string, number>();
      for (const r of rows) totals.set(r.currency, round2((totals.get(r.currency) ?? 0) + r.amount_due));
      return {
        count: rows.length,
        totals_due: Object.fromEntries(totals),
        invoices: rows.slice(0, limit),
        truncated: rows.length > limit,
      };
    },
  },
  {
    name: "search_invoices",
    title: "Search invoices",
    description:
      "List invoices and credit notes with filters. Dates are YYYY-MM-DD. Returns a compact view; use get_invoice for full line items.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Client name (partial match)" },
        status: { type: "array", items: { type: "string", enum: STATUS_ENUM } },
        unpaid: { type: "boolean" },
        currency: { type: "string" },
        from: { type: "string", description: "Issued on or after (YYYY-MM-DD)" },
        to: { type: "string", description: "Issued on or before (YYYY-MM-DD)" },
        type: { type: "string", enum: ["invoice", "credit_note"] },
        text: { type: "string", description: "Free text searched in line items and notes (e.g. 'Nice', 'jet')" },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 50 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => {
      const sp = new URLSearchParams();
      const status = Array.isArray(args.status) ? args.status.join(",") : str(args.status);
      if (status) sp.set("status", status);
      if (args.unpaid === true) sp.set("unpaid", "true");
      for (const k of ["currency", "client", "from", "to", "type"] as const) {
        const v = str(args[k]);
        if (v) sp.set(k, v);
      }
      sp.set("limit", String(args.limit ?? 50));
      sp.set("offset", String(args.offset ?? 0));
      const params = parseListParams(new URL(`http://x/?${sp}`));
      if (typeof params === "string") throw new ToolError(params);
      const text = str(args.text)?.toLowerCase();
      const matched = applyFilters(await fetchAllDocuments(), params).filter(
        (i) =>
          !text ||
          (i.items ?? []).some((it) => it.description?.toLowerCase().includes(text)) ||
          (i.notes ?? "").toLowerCase().includes(text),
      );
      const today = new Date();
      return {
        total: matched.length,
        offset: params.offset,
        invoices: matched.slice(params.offset, params.offset + params.limit).map((i) => brief(i, today)),
      };
    },
  },
  {
    name: "get_invoice",
    title: "Get one invoice",
    description: "Full invoice by number: line items with prices, totals, amount paid/due, status, PDF link.",
    inputSchema: {
      type: "object",
      properties: { invoice_number: { type: "integer", description: "e.g. 3398" } },
      required: ["invoice_number"],
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => ({ invoice: toApiInvoice(await loadByNumber(invoiceNumber(args.invoice_number))) }),
  },
  {
    name: "list_clients",
    title: "List clients",
    description: "Client directory with invoice counts, dates and per-currency totals (billed / paid / unpaid).",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Filter by name" } },
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => {
      const q = str(args.query);
      const docs = await fetchAllDocuments();
      const clients = deriveClients(docs).filter((c) => !q || nameMatches(c.name, q));
      return {
        count: clients.length,
        clients: clients.map((c) => ({
          name: c.name,
          invoice_count: c.invoiceCount,
          first_invoice_date: c.firstDate,
          last_invoice_date: c.lastDate,
          totals: summarize(docs.filter((d) => clientKey(d.client_name) === c.key)).map((t) => ({
            currency: t.currency,
            invoiced: t.invoiced,
            paid: t.paid,
            unpaid: t.unpaid,
          })),
        })),
      };
    },
  },
  {
    name: "get_client",
    title: "Get one client",
    description: "One client's address, totals per currency and every invoice (compact).",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Exact client name (case-insensitive); use list_clients to find it" } },
      required: ["name"],
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => {
      const name = str(args.name);
      if (!name) throw new ToolError("name is required");
      const docs = await fetchAllDocuments();
      const profile = getClientProfile(docs, name);
      if (!profile) throw new ToolError(`Unknown client "${name}". Try list_clients with a partial name.`);
      const today = new Date();
      return {
        name: profile.summary.name,
        address: profile.summary.address,
        totals: summarize(profile.invoices),
        invoices: profile.invoices.map((i) => brief(i, today)),
      };
    },
  },
  {
    name: "find_invoices_for_payment",
    title: "Match a payment to invoices",
    description:
      "Given a received payment (amount, currency, optional payer name/date), returns the unpaid invoices that could match: single invoices whose amount due or total equals the amount (within tolerance), and combinations of 2–3 invoices of the same client that add up to it. Read-only — show the candidates to the user before calling record_payment.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount received" },
        currency: { type: "string", description: "ISO code of the payment" },
        payer: { type: "string", description: "Name on the bank transfer, if known" },
        date: { type: "string", description: "Payment date YYYY-MM-DD (invoices issued after it are ranked lower)" },
        tolerance: { type: "number", description: "Allowed difference (bank fees, FX), default 1% of amount", minimum: 0 },
      },
      required: ["amount"],
      additionalProperties: false,
    },
    annotations: READ,
    run: async (args) => {
      const amount = num(args.amount, "amount");
      if (amount <= 0) throw new ToolError("amount must be positive");
      const currency = str(args.currency)?.toUpperCase();
      const payer = str(args.payer);
      const date = str(args.date);
      const tol = args.tolerance == null ? Math.max(1, amount * 0.01) : num(args.tolerance, "tolerance");
      const today = new Date();

      const open = (await fetchAllDocuments()).filter(
        (i) =>
          isUnpaid(i) &&
          !isCreditNote(i) &&
          (!currency || (i.currency || "USD").toUpperCase() === currency),
      );

      const score = (invs: Invoice[], diff: number) => {
        let s = 100 - (diff / Math.max(tol, 0.01)) * 30;
        if (payer && invs.every((i) => nameMatches(i.client_name, payer) || nameMatches(payer, i.client_name))) s += 40;
        if (date && invs.some((i) => i.date > date)) s -= 50;
        s -= (invs.length - 1) * 10;
        return Math.round(s);
      };

      type Candidate = { invoices: ReturnType<typeof brief>[]; matched_on: string; difference: number; score: number };
      const candidates: Candidate[] = [];

      for (const inv of open) {
        const due = amountDue(inv);
        const total = Number(inv.total);
        const dDue = Math.abs(due - amount);
        const dTotal = Math.abs(total - amount);
        if (dDue <= tol || dTotal <= tol) {
          const onDue = dDue <= dTotal;
          const diff = round2(onDue ? dDue : dTotal);
          candidates.push({ invoices: [brief(inv, today)], matched_on: onDue ? "amount_due" : "total", difference: diff, score: score([inv], diff) });
        } else if (due > amount && (!payer || nameMatches(inv.client_name, payer))) {
          // Possible partial payment — only worth showing when the payer matches.
          if (payer) candidates.push({ invoices: [brief(inv, today)], matched_on: "partial_payment", difference: round2(due - amount), score: 20 });
        }
      }

      // Combinations of 2–3 invoices from the same client & currency.
      const groups = new Map<string, Invoice[]>();
      for (const inv of open) {
        if (payer && !nameMatches(inv.client_name, payer)) continue;
        const k = `${clientKey(inv.client_name)}|${(inv.currency || "USD").toUpperCase()}`;
        const g = groups.get(k) ?? [];
        g.push(inv);
        groups.set(k, g);
      }
      for (const g of groups.values()) {
        const list = g.filter((i) => amountDue(i) > 0 && amountDue(i) < amount).slice(0, 40);
        for (let a = 0; a < list.length; a++)
          for (let b = a + 1; b < list.length; b++) {
            const s2 = amountDue(list[a]) + amountDue(list[b]);
            if (Math.abs(s2 - amount) <= tol) {
              const diff = round2(Math.abs(s2 - amount));
              candidates.push({ invoices: [list[a], list[b]].map((i) => brief(i, today)), matched_on: "sum_of_amount_due", difference: diff, score: score([list[a], list[b]], diff) });
            }
            for (let c = b + 1; c < list.length; c++) {
              const s3 = s2 + amountDue(list[c]);
              if (Math.abs(s3 - amount) <= tol) {
                const diff = round2(Math.abs(s3 - amount));
                candidates.push({ invoices: [list[a], list[b], list[c]].map((i) => brief(i, today)), matched_on: "sum_of_amount_due", difference: diff, score: score([list[a], list[b], list[c]], diff) });
              }
            }
          }
      }

      candidates.sort((x, y) => y.score - x.score);
      return {
        payment: { amount, currency: currency ?? null, payer: payer ?? null, date: date ?? null, tolerance: round2(tol) },
        candidate_count: candidates.length,
        candidates: candidates.slice(0, 15),
        hint: candidates.length
          ? "Confirm the right candidate with the user, then call record_payment for each invoice."
          : "No match. Try a larger tolerance, another currency, or search_invoices by client.",
      };
    },
  },
  {
    name: "record_payment",
    title: "Record a payment on an invoice",
    description:
      "WRITE. Records money received on an invoice. If it covers the full amount due, the invoice is marked paid; otherwise the amount is deducted (it appears as 'Amount paid' on the invoice and the balance due decreases). Only call after the user confirmed the match.",
    inputSchema: {
      type: "object",
      properties: {
        invoice_number: { type: "integer" },
        amount: { type: "number", description: "Amount received, in the invoice currency" },
        currency: { type: "string", description: "Currency of the payment — must equal the invoice currency" },
        payment_date: { type: "string", description: "YYYY-MM-DD (informational)" },
        reference: { type: "string", description: "Bank reference (informational)" },
      },
      required: ["invoice_number", "amount", "currency"],
      additionalProperties: false,
    },
    annotations: { ...WRITE, title: "Record payment" },
    run: (args) => applyPayment(args),
  },
  {
    name: "record_payments",
    title: "Record several payments",
    description:
      "WRITE. Batch version of record_payment (max 100) for a reconciliation run. Each entry is applied independently: failures (already paid, currency mismatch, overpayment…) are reported without stopping the others. Only call after the user approved the list.",
    inputSchema: {
      type: "object",
      properties: {
        payments: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              invoice_number: { type: "integer" },
              amount: { type: "number" },
              currency: { type: "string" },
              payment_date: { type: "string" },
              reference: { type: "string" },
            },
            required: ["invoice_number", "amount", "currency"],
            additionalProperties: false,
          },
        },
      },
      required: ["payments"],
      additionalProperties: false,
    },
    annotations: { ...WRITE, title: "Record payments (batch)" },
    run: async (args) => {
      const list = Array.isArray(args.payments) ? (args.payments as Record<string, unknown>[]) : [];
      if (list.length === 0 || list.length > 100) throw new ToolError("payments must contain 1 to 100 entries");
      const results: Record<string, unknown>[] = [];
      // Sequential on purpose: two entries may target the same invoice.
      for (const p of list) {
        try {
          const r = await applyPayment(p);
          results.push({ invoice_number: p.invoice_number, ok: true, outcome: r.outcome, amount_due_after: (r.after as { amount_due: number }).amount_due });
        } catch (e) {
          if (!(e instanceof ToolError)) throw e;
          results.push({ invoice_number: p.invoice_number, ok: false, error: e.message });
        }
      }
      const failed = results.filter((r) => !r.ok).length;
      return { applied: results.length - failed, failed, results };
    },
  },
  {
    name: "set_invoice_status",
    title: "Change invoice status",
    description:
      "WRITE. Sets status to draft, sent, paid or overdue (for a credit note, paid = refunded). Does not change amounts. Confirm with the user first.",
    inputSchema: {
      type: "object",
      properties: {
        invoice_number: { type: "integer" },
        status: { type: "string", enum: STATUS_ENUM },
      },
      required: ["invoice_number", "status"],
      additionalProperties: false,
    },
    annotations: { ...WRITE, idempotentHint: true, title: "Set status" },
    run: async (args) => {
      const status = str(args.status) as InvoiceStatus | undefined;
      if (!status || !STATUS_ENUM.includes(status)) throw new ToolError(`status must be one of ${STATUS_ENUM.join(", ")}`);
      const inv = await loadByNumber(invoiceNumber(args.invoice_number));
      const previous = inv.status;
      const updated = previous === status ? inv : await updateInvoice(inv, { status });
      return { previous_status: previous, invoice: brief(updated) };
    },
  },
];
