/**
 * Facture #3373 (Krum Totin) — Paris & Burgundy (Oct.) + Miami / Tulum / Isla Mujeres (Dec.–Jan.). En USD.
 *
 *   node scripts/create-invoice-3373.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3373.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3373;
const CLIENT_NAME = "Krum Totin";
const LABEL = `#${INVOICE_NUMBER}-KrumTotin`;
const INVOICE_DATE = "2026-11-09";
const CURRENCY = "USD";

/** [description, date de prestation | null, montant USD, quantité?, prix unitaire?] */
const ITEMS = [
  // Paris & Burgundy (Oct. 2026) — prestations EUR converties à 1,10
  ["Flights Sofia - Paris CDG - Sofia, Bulgaria Air, Economy outbound / Business return, 2 pax", "15.10.26 & 20.10.26", 1980.0],
  ["Range Rover rental, 3 days, 1,000 km included", "15.10.26 - 17.10.26", 2090.0],
  ["Car delivery at CDG Airport", "15.10.26", 110.0],
  ["Fuel, deducted from the car deposit", null, 132.0],
  ["Moulin Rouge, Champagne Show, 2 pax", "17.10.26", 418.0],
  ["Transfer Plaza Athénée - CDG, Van", "20.10.26", 154.0],
  ["COMO Le Montrachet, Manoir Suite, Bed & Breakfast, 1 night", "15.10.26", 953.0],
  ["Château de la Resle, Suite Montigny, Bed & Breakfast, 1 night", "16.10.26", 450.0],
  ["Hôtel Plaza Athénée, Deluxe Room, breakfast included, 3 nights", "17.10.26 - 20.10.26", 10296.0],
  // Miami / Tulum / Isla Mujeres (Dec. 2026 – Jan. 2027)
  ["Flight Sofia - Miami (27.12.26) and Flight Cancún - Sofia (13.01.27), Turkish Airlines, Business, 2 pax", null, 17050.0],
  ["Fontainebleau Miami Beach, Trésor Bayview Junior Suite, Bed & Breakfast, 6 nights", "27.12.26 - 02.01.27", 7080.0],
  ["Nikki Beach Miami, VIP Table for 2, New Year's Eve", "31.12.26", 900.0],
  ["Flight Miami - Tulum, American Airlines, Business, 2 pax", "02.01.27", 1255.0],
  ["Conrad Tulum Riviera Maya, Ocean View King, All Inclusive, 6 nights", "02.01.27 - 08.01.27", 6424.0],
  ["Impression Isla Mujeres by Secrets, Signature Junior Suite Ocean Front with Hot Tub, All Inclusive, 5 nights", "08.01.27 - 13.01.27", 8682.0],
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
