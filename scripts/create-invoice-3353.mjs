/**
 * Facture #3353 (BrezScales) — Nice - Corfu - Bari en jet privé, Corfu Imperial (Grecotel),
 * transferts Corfu, chauffeurs Bari, Milan & Londres. En EUR.
 *
 * Taux appliqués : 1 USD = 0,89 EUR (hôtel facturé en USD)
 *                  1 GBP = 1,33 USD (chauffeurs Londres, convertis ensuite en EUR)
 *
 *   node scripts/create-invoice-3353.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3353.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3353;
const CLIENT_NAME = "BrezScales";
const LABEL = `#${INVOICE_NUMBER}-BrezScales`;
const INVOICE_DATE = "2026-11-04";
const CURRENCY = "EUR";

const USD_EUR = 0.89;
const GBP_USD = 1.33; // chauffeurs Londres facturés en GBP
const eur = (x) => Math.round(x * 100) / 100;

/** [description, date de prestation | null, montant EUR, quantité?, prix unitaire?] */
const ITEMS = [
  ["Private Jet - Citation 560 XLS SX-AQG - 2 passengers\nNice (LFMN) - Corfu (LGKR)", "24.07.26", 7500.0],
  ["Private driver - Corfu\nPrivate jet - Hotel", "24.07.26", 120.0],
  ["Corfu Imperial, a Grecotel Resort\nSwim Up Family Bungalow Open Plan - 3 nights\nBed & Breakfast - 2 adults (ref. WSH095314)", "24.07.26 - 27.07.26", eur(3574 * USD_EUR)],
  ["Private driver - Corfu\nHotel - Airport", "27.07.26", 120.0],
  ["Private Jet - Hawker 900XP F-HFCS - 2 passengers\nCorfu (LGKR) - Bari (LIBD)", "27.07.26", 11000.0],
  ["Car with chauffeur at disposal - Bari", "27.07.26", 400.0],
  ["Extra car with chauffeur at disposal - Milan", "28.07.26", 600.0],
  ["Private chauffeur London - Mercedes V-Class\nHeathrow Airport (LHR) - Nobu Hotel London", "31.07.26", eur(144 * GBP_USD * USD_EUR)],
  ["Private chauffeur London - Mercedes V-Class (2nd vehicle)\nHeathrow Airport (LHR) - Nobu Hotel London, incl. 1h waiting time", "31.07.26", eur(228 * GBP_USD * USD_EUR)],
  ["Private chauffeur London - Mercedes V-Class\nNobu Hotel London - Heathrow Airport (LHR)", "01.08.26", eur(144 * GBP_USD * USD_EUR)],
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
