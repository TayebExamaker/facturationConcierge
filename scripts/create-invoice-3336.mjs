/**
 * Facture #3336 (Tristan Thompson) — United LAX - London + BA London - LAX (2 pax, Business), 4 transferts,
 * Hotel Peninsula London (Premier Room + Junior Suite), en USD.
 *
 *   node scripts/create-invoice-3336.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3336.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3336;
const CLIENT_NAME = "Tristan Thompson";
const LABEL = `#${INVOICE_NUMBER}-TristanThompson`;
const INVOICE_DATE = "2026-10-29";
const CURRENCY = "USD";

/** [description, date de prestation | null, montant USD, quantité?, prix unitaire?] */
const ITEMS = [
  ["Private driver\nLA residence - LAX Airport", "12.11.26", 300.0],
  ["United Airlines Business Class - 2 passengers\nLos Angeles (LAX) - London", "12.11.26", 29540.0, 2, 14770.0],
  ["Private driver\nLondon Airport - Hotel Peninsula London", "13.11.26", 266.0], // 200 GBP × 1.33
  ["Hotel Peninsula - London\nPremier Room", "13.11.26 - 18.11.26", 12644.0],
  ["Hotel Peninsula - London\nJunior Suite", "13.11.26 - 18.11.26", 15231.0],
  ["Private driver\nHotel Peninsula London - London Airport", "19.11.26", 266.0],
  ["British Airways Business Class - 2 passengers\nLondon - Los Angeles (LAX)", "19.11.26", 21026.16, 2, 10513.08],
  ["Private driver\nLAX Airport - LA residence", "19.11.26", 300.0],
];

const items = ITEMS.map(([description, when, amount, quantity, unitPrice]) => ({
  description: when ? `${description}\n${when}` : description,
  quantity: quantity ?? 1,
  unit_price: unitPrice ?? amount,
  amount,
}));

// Arrondi au cent pour éviter les résidus flottants sur numeric(14,2).
const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;

const row = {
  invoice_number: INVOICE_NUMBER,
  label: LABEL,
  client_name: CLIENT_NAME,
  client_address: null,
  date: INVOICE_DATE,
  payment_terms: "Due on receipt",
  payment_instructions: null, // null = suit le bloc global de /settings
  po_number: null,
  currency: CURRENCY,
  items,
  subtotal: total,
  tax_rate: 0,
  tax_amount: 0,
  discount: 0,
  shipping: 0,
  total,
  to_be_paid: 0, // entièrement payée : "Payments received" = total, solde 0
  notes: null,
  status: "paid",
  source: "created",
  pdf_url: null,
  company: COMPANY_KEY,
};

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
  console.log(`Facture #${INVOICE_NUMBER} — ${CLIENT_NAME}`);
  console.log(`${items.length} lignes · total ${total.toFixed(2)} ${CURRENCY}\n`);

  if (DRY) {
    for (const it of items) {
      console.log(
        `${it.amount.toFixed(2).padStart(10)}  ${it.description.replace(/\n/g, "  ·  ")}`
      );
    }
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

  // invoice_number est unique globalement (les deux apps partagent la table).
  // S'il existe déjà, on met à jour — mais seulement si la facture nous
  // appartient ET porte le bon client, pour ne jamais écraser celle d'un autre.
  const check = await fetch(
    `${base}?select=id,client_name,company&invoice_number=eq.${INVOICE_NUMBER}`,
    { headers }
  );
  if (!check.ok) {
    console.error(`Lecture échouée (${check.status}): ${await check.text()}`);
    process.exit(1);
  }
  const [existing] = await check.json();

  if (existing) {
    if (existing.company !== COMPANY_KEY || existing.client_name !== CLIENT_NAME) {
      console.error(
        `Le numéro ${INVOICE_NUMBER} appartient à ${existing.client_name} ` +
          `(${existing.company}) — refus d'écraser. Change INVOICE_NUMBER.`
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
    console.log(`✅ Mise à jour — id ${existing.id}`);
    console.log(`   /invoices/${existing.id}`);
    return;
  }

  const res = await fetch(base, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error(`Insertion échouée (${res.status}): ${await res.text()}`);
    process.exit(1);
  }

  const [created] = await res.json();
  console.log(`✅ Créée — id ${created.id}`);
  console.log(`   /invoices/${created.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
