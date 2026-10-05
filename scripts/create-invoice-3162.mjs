/**
 * Facture #3162 (Matthias Ferreira) — création ou mise à jour dans Supabase.
 *
 * Écrit via l'API REST (fetch natif) — pas besoin de node_modules. La ligne
 * produite est celle que produirait `createInvoice()` (app/actions/invoices.ts
 * → prepareRow) : mêmes colonnes, company tag, payment_instructions à null
 * pour rester liée au bloc global de /settings.
 *
 *   node scripts/create-invoice-3162.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3162.mjs --dry    # affiche le payload, n'écrit rien
 *
 * Lit NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY depuis
 * .env.local (ou l'environnement). Script jetable : supprimable après usage.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3162;
const CLIENT_NAME = "Matthias Ferreira";
const INVOICE_DATE = "2026-09-14";
const CURRENCY = "USD";

/**
 * [description, date de prestation | null, montant USD] — lignes d'origine (dont Wedding
 * Event), puis les bookings ajoutés le 01 Oct 2026.
 * La date part en 2e ligne de la description : la table du PDF n'a pas de
 * colonne date (cf. lib/pdf/generate.tsx).
 */
const ITEMS = [
  [
    "Vueling flight VY3960 – Ibiza (IBZ) to Santander (SDR) – Sarah Korn – including luggage",
    "06 Aug 2026",
    135.72,
  ],
  [
    "Emirates Business Class EK103 – Dubai (DXB) to Athens (ATH) – Matthias Ferreira",
    "13 Aug 2026",
    2000.0,
  ],
  [
    "Aegean Economy A3382 – Athens (ATH) to Mykonos (JMK) – Matthias Ferreira – including 23 kg checked baggage",
    "13 Aug 2026",
    133.4,
  ],
  [
    "VIP transfer – Mykonos to Mykonos – Matthias Ferreira",
    "17 Aug 2026",
    184.0,
  ],
  [
    "Helicopter transfer – Mykonos to Athens",
    "17 Aug 2026",
    2012.50,
  ],
  [
    "Emirates Business Class – Athens (ATH) to Dubai (DXB) – Matthias Ferreira",
    "17 Aug 2026",
    2600.0,
  ],
  [
    "Vueling flight VY1469 – Santander (SDR) to Paris-Orly (ORY) – Sarah Korn – including 25 kg checked baggage",
    "18 Aug 2026",
    324.8,
  ],
  [
    "V-Class transfer – Paris-Orly (ORY) to Paris-CDG – Sarah Korn",
    "18 Aug 2026",
    208.8,
  ],
  [
    "Emirates Business Class EK076 – Paris-CDG to Dubai (DXB) – Sarah Korn",
    "18 Aug 2026",
    2300.0,
  ],
  [
    "Emirates Business Class – Dubai (DXB) to Bologna (BLQ) – Matthias Ferreira & Sarah Korn",
    "17 Sep 2026",
    4600.00,
  ],
  [
    "V-Class transfer – Bologna Airport to Four Seasons Florence",
    "17 Sep 2026",
    229.29,
  ],
  [
    "Four Seasons Hotel Florence – Gallery Suite – Bed & Breakfast – Matthias Ferreira & Sarah Korn – 2 adults",
    "17–19 Sep 2026",
    10981.00,
  ],
  [
    "Four Seasons Hotel Florence – Gallery Suite – Bed & Breakfast – extra night",
    "19–20 Sep 2026",
    4730.00,
  ],
  [
    "Rosewood Castiglion del Bosco – Suite – Room Only – extra night",
    "20–21 Sep 2026",
    6639.00,
  ],
  [
    "Car rental – Mercedes G63 AMG – 4 days",
    "20–24 Sep 2026",
    5080.80,
  ],
  [
    "Rosewood Castiglion del Bosco – Castiglion del Bosco Suite – Room Only – Matthias Ferreira & Sarah Korn – 2 adults",
    "21–24 Sep 2026",
    15053.00,
  ],
  [
    "V-Class transfer – Rosewood Castiglion del Bosco to Siena Airport",
    "24 Sep 2026",
    432.86,
  ],
  [
    "Private jet C-560XL – Siena (LIQS) to Naples (LIRN) – flight BOH712 – 2 pax",
    "24 Sep 2026",
    11163.18,
  ],
  [
    "Private boat transfer – Naples to Capri – Riva Rivarama 44",
    "24 Sep 2026",
    2597.15,
  ],
  [
    "Jumeirah Capri Palace – Executive Suite, Terrace, Sea View – Bed & Breakfast – Matthias Ferreira & Sarah Korn – 2 adults",
    "24–27 Sep 2026",
    26327.00,
  ],
  [
    "Wedding Event",
    null,
    31389.82, // 30 925,93 + 1,5 % FX
  ],
  [
    "VIP transfer – Capri",
    "25 Sep 2026",
    120.74,
  ],
  [
    "Half-day boat tour – Capri – Princess V65",
    "26 Sep 2026",
    4100.76,
  ],
  [
    "VIP transfer – Capri (return from boat)",
    "26 Sep 2026",
    121.10,
  ],
  [
    "Private cooking class – Capri – 2 pax",
    "27 Sep 2026",
    696.00,
  ],
  [
    "Romeo Hotel Naples – Junior Studio Suite – Bed & Breakfast",
    "27–28 Sep 2026",
    1579.00,
  ],
  [
    "Transfer – Naples",
    "27–28 Sep 2026",
    151.80,
  ],
  [
    "flydubai Business Class – Naples (NAP) to Dubai (DXB) – Matthias Ferreira & Sarah Korn",
    "28 Sep 2026",
    3850.00,
  ],
];

const items = ITEMS.map(([description, when, amount]) => ({
  description: when ? `${description}\n${when}` : description,
  quantity: 1,
  unit_price: amount,
  amount,
}));

// Arrondi au cent pour éviter les résidus flottants sur numeric(14,2).
const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;

const row = {
  invoice_number: INVOICE_NUMBER,
  label: `#${INVOICE_NUMBER}-MatthiasFerreira`,
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
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  const { url, key } = loadEnv();
  if (!url || !key) {
    console.error(
      "Manque NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
        "Crée .env.local à la racine (voir .env.example) puis relance."
    );
    process.exit(1);
  }

  const base = `${url.replace(/\/+$/, "")}/rest/v1/invoices`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  // invoice_number est unique globalement (les deux apps partagent la table).
  // S'il existe déjà, on met à jour cette facture au lieu d'échouer — mais
  // seulement si elle nous appartient ET porte le bon client, pour ne jamais
  // écraser la facture d'un autre par accident.
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
