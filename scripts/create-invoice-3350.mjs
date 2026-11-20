/**
 * Facture #3350 (ZAKIA) — séjour Paris : Al Majlis Dubai,
 * chauffeurs, Plaza Athénée, changements Emirates, activités, Rimowa. En USD.
 * Complète le brouillon #3350 créé dans l'app (qui était en USD avec des lignes vides).
 *
 * Montants USD fixés ligne par ligne (corrigés le 04.11.26)
 *
 *   node scripts/create-invoice-3350.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3350.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3350;
const CLIENT_NAME = "ZAKIA";
const LABEL = `#${INVOICE_NUMBER}-ZAKIA`;
const INVOICE_DATE = "2026-11-03";
const CURRENCY = "USD";

const AED_EUR = 0.24;
const USD_EUR = 0.89;
const eur = (x) => Math.round(x * 100) / 100;

/** [description, date de prestation | null, montant USD, quantité?, prix unitaire?] */
const ITEMS = [
  ["Al Majlis VIP departure - Dubai DXB\nEK055 Dubai - Düsseldorf - 5 passengers", "29.10.26", 3267.53],
  ["Al Majlis VIP arrival - Dubai DXB\nEK072 Paris CDG - Dubai - 5 passengers", "03.11.26", 3267.53],
  ["VIP meet & greet departure - Paris\n5 passengers", null, 472.74],
  ["Airport transfers - V-Class\nLe Bourget - Plaza Athénée", "01.11.26", 337.68, 2, 168.84],
  ["Private driver - S-Class\n4 hours", "02.11.26", 450.23],
  ["Private driver - V-Class at disposal\n10 hours", "02.11.26", 900.46],
  ["Airport transfers - V-Class\nPlaza Athénée - Le Bourget", "03.11.26", 337.68, 2, 168.84],
  ["Hôtel Plaza Athénée - Paris\nSuite - 2 nights", "01.11.26 - 03.11.26", 11255.72, 2, 5627.86],
  ["Hôtel Plaza Athénée - Paris\nExtras (city tax, concierge, transport)", null, 272.23],
  ["Emirates ticket changes - Business Flex Plus + date change\nEK072 Paris CDG - Dubai", "03.11.26", 2400.0, 3, 800.0],
  ["Emirates ticket changes - First Class\nEK072 Paris CDG - Dubai", "03.11.26", 500.0, 2, 250.0],
  ["Emirates upgrade - Business to First Class\nEK072 Paris CDG - Dubai", "03.11.26", 1500.0],
  ["Activity\nEscape game - The Game Paris", "02.11.26", 174.46],
  ["Activity\nParadox Museum Paris", "02.11.26", 142.95],
  ["Rimowa luggage", null, 2194.86],
  ["Emirates additional baggage 20 kg\nEK072 Paris CDG - Dubai", "03.11.26", 276.89],
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
  to_be_paid: total,
  notes: null,
  status: "draft",
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
