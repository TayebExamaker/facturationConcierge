/**
 * Facture #3203 (Charlene Xiahoan Tang) — prestations chauffeur Olbia (16–21 Sep) & Milan (21–28 Sep) 2026 — création ou mise à jour dans Supabase.
 *
 * Facture en EUR.
 *
 *   node scripts/create-invoice-3203.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3203.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3203;
const CLIENT_NAME = "CHARLENE XIAHOAN TANG";
const INVOICE_DATE = "2026-09-27";
const CURRENCY = "EUR";

/**
 * [description, date de prestation | null, montant EUR]
 * La date part en 2e ligne de la description : la table du PDF n'a pas de
 * colonne date (cf. lib/pdf/generate.tsx).
 */
const ITEMS = [
  ["Chauffeur – 6 extra hours – tables & water – Olbia", "16 Sep 2026", 1711.0],
  ["Chauffeur – 16.5 hours – Olbia", "17 Sep 2026", 1916.0],
  ["Chauffeur – 13:30–00:45 – Olbia", "18 Sep 2026", 1300.0],
  ["Chauffeur – 14 hours – Olbia", "19 Sep 2026", 1626.0],
  ["Chauffeur – 11h20 – Olbia", "20 Sep 2026", 1315.0],
  ["Chauffeur – 3 vans – 1 van 11:00–13:30 + 2 vans 12:30–13:30 – Olbia", "21 Sep 2026", 1160.0],
  ["Chauffeur – V-Class transfers – Milan", "21 Sep 2026", 380.0, 2, 190.0],
  ["Chauffeur – V-Class at disposal with Victor – 15:00–23:00 – 8 hours – Milan", "21 Sep 2026", 960.0],
  ["Chauffeur – V-Class at disposal – 10:30–03:30 – 17 hours – Milan", "22 Sep 2026", 2040.0],
  ["Chauffeur – V-Class at disposal – 12:15–00:15 – 12 hours – Milan", "23 Sep 2026", 1440.0],
  ["Chauffeur – V-Class at disposal – 11:30–02:00 – 14.5 hours – Milan", "24 Sep 2026", 1740.0],
  ["Chauffeur – V-Class at disposal – 09:30–22:00 – 12.5 hours – Milan", "25 Sep 2026", 1500.0],
  ["Chauffeur – V-Class at disposal – 14:00–04:00 – 14 hours – Milan", "26 Sep 2026", 1680.0],
  ["Chauffeur – V-Class airport transfers – Milan", "27 Sep 2026", 380.0, 2, 190.0],
  ["Chauffeur – V-Class transfers – Milan", "28 Sep 2026", 380.0, 2, 190.0],
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
  label: `#${INVOICE_NUMBER}-CHARLENEXIAHOANTANG`,
  client_name: CLIENT_NAME,
  client_address: null,
  date: INVOICE_DATE,
  payment_terms: null,
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
  status: "sent",
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
