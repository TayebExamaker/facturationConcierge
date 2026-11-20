/**
 * Credit note #3378 (Houston Cooksey) — refund against invoice #3333 (AED 2,706.63).
 * The Heritage Hotel, Autograph Collection, 09.11.26 - 13.11.26, cancelled
 * within the free-cancellation window; refunded by bank transfer on 05.11.26.
 *
 * Requires supabase/migrations/0006_credit_notes.sql to have been applied.
 *
 *   node scripts/create-credit-note-3378.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-credit-note-3378.mjs --dry    # affiche la ligne, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const CREDIT_NOTE_NUMBER = 3378;
const CREDITED_INVOICE_NUMBER = 3333;
const CLIENT_NAME = "Houston Cooksey";
const DATE = "2026-11-09";
const CURRENCY = "AED";
// Montant effectivement remboursé (virement Airwallex du 05.11.26), et non
// les 2 707,00 de la facture : le credit note colle au virement.
const AMOUNT = 2706.63;

export const REFUND_DETAILS = [
  "Refund by bank transfer:",
  "Refunded on: 05 Nov 2026",
  "Beneficiary: Hail And Cotton International Leaf Tobacco Trading FZE",
  "Bank Name: National Bank of Ras Al-Khaimah",
  "IBAN: AE620400000323720957001",
  "SWIFT Code: NRAKAEAK",
  "Transfer reference: P261105-6V4HL9U",
  "",
  "Best regards",
].join("\n");

export const NOTES =
  "Booking cancelled within the free cancellation period. " +
  `Refund issued against invoice #${CREDITED_INVOICE_NUMBER}.`;

export const ITEMS = [
  {
    description:
      "Cancellation & refund\nThe Heritage Hotel, Autograph Collection\n09.11.26 - 13.11.26",
    quantity: 1,
    unit_price: AMOUNT,
    amount: AMOUNT,
  },
];

function buildRow(creditedInvoiceId) {
  return {
    invoice_number: CREDIT_NOTE_NUMBER,
    label: `#${CREDIT_NOTE_NUMBER}-HoustonCooksey`,
    client_name: CLIENT_NAME,
    client_address: null,
    date: DATE,
    payment_terms: null,
    payment_instructions: REFUND_DETAILS,
    po_number: null,
    currency: CURRENCY,
    items: ITEMS,
    subtotal: AMOUNT,
    tax_rate: 0,
    tax_amount: 0,
    discount: 0,
    shipping: 0,
    total: AMOUNT,
    to_be_paid: AMOUNT,
    notes: NOTES,
    status: "paid", // credit note + paid = refunded
    source: "created",
    pdf_url: null,
    company: COMPANY_KEY,
    document_type: "credit_note",
    credited_invoice_id: creditedInvoiceId,
    credited_invoice_number: CREDITED_INVOICE_NUMBER,
  };
}

function loadEnv() {
  const fromProcess = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  if (fromProcess.url && fromProcess.key) return fromProcess;
  let raw;
  try {
    raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  } catch {
    return fromProcess;
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return {
    url: fromProcess.url || env.NEXT_PUBLIC_SUPABASE_URL,
    key: fromProcess.key || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

async function main() {
  console.log(`Credit note #${CREDIT_NOTE_NUMBER} — ${CLIENT_NAME} (invoice #${CREDITED_INVOICE_NUMBER})`);
  console.log(`total credited ${AMOUNT.toFixed(2)} ${CURRENCY}\n`);
  if (DRY) {
    console.log(JSON.stringify(buildRow("<invoice 3333 id>"), null, 2));
    return;
  }

  const { url, key } = loadEnv();
  if (!url || !key) {
    console.error("Manque NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }
  const base = `${url.replace(/\/+$/, "")}/rest/v1/invoices`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const get = async (q) => {
    const r = await fetch(`${base}?${q}`, { headers });
    if (!r.ok) {
      console.error(`Lecture échouée (${r.status}): ${await r.text()}`);
      process.exit(1);
    }
    return r.json();
  };

  const [original] = await get(
    `select=id,client_name,company&invoice_number=eq.${CREDITED_INVOICE_NUMBER}`
  );
  if (!original || original.company !== COMPANY_KEY || original.client_name !== CLIENT_NAME) {
    console.error(`Facture #${CREDITED_INVOICE_NUMBER} (${CLIENT_NAME}) introuvable — abandon.`);
    process.exit(1);
  }
  const row = buildRow(original.id);

  const [existing] = await get(
    `select=id,client_name,company,document_type&invoice_number=eq.${CREDIT_NOTE_NUMBER}`
  );
  if (existing) {
    if (
      existing.company !== COMPANY_KEY ||
      existing.client_name !== CLIENT_NAME ||
      existing.document_type !== "credit_note"
    ) {
      console.error(
        `Le numéro ${CREDIT_NOTE_NUMBER} est déjà pris par ${existing.client_name} ` +
          `(${existing.company}) — refus d'écraser. Change CREDIT_NOTE_NUMBER et régénère le PDF.`
      );
      process.exit(1);
    }
    const res = await fetch(`${base}?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error(`Mise à jour échouée (${res.status}): ${await res.text()}`);
      process.exit(1);
    }
    console.log(`✅ Mise à jour — /invoices/${existing.id}`);
    return;
  }

  const res = await fetch(base, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`Insertion échouée (${res.status}): ${txt}`);
    if (/document_type|credited_invoice/.test(txt)) {
      console.error("→ Applique d'abord supabase/migrations/0006_credit_notes.sql (SQL editor Supabase).");
    }
    process.exit(1);
  }
  const [created] = await res.json();
  console.log(`✅ Créée — /invoices/${created.id}`);
}

// Only run when executed directly (the PDF render script imports the data).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
