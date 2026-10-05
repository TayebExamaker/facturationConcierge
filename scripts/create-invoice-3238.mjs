/**
 * Facture #3238 (Overtime Sport Agency FZCO, réf. Ramses) — billets d'avion sept./oct. 2026, montants en USD.
 *
 *   node scripts/create-invoice-3238.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3238.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3238;
const CLIENT_NAME = "Overtime Sport Agency FZCO";
const LABEL = `#${INVOICE_NUMBER}-OvertimeSportAgencyFZCO`;
const INVOICE_DATE = "2026-10-05";
const CURRENCY = "USD";

/** Marges en EUR, converties en USD et ajoutées au prix de chaque billet. */
const EUR_USD = 1.12;

/** [description, date de prestation | null, montant USD = billet + marge] */
const ITEMS = [
  ["Flight Ticket – Dubai - Paris – 19.09.26 – Karl Mwalako Buchmann (LLASKJ)", null, 3800.0 + 1000 * EUR_USD],
  ["Flight Ticket – Paris - Douala – 20.09.26 / 05.10.26 – Hector Bondima Salley (X2JEZV)", null, 4690.0 + 350 * EUR_USD],
  ["Flight Ticket – New York - London – 27.09.26 – Karl Mwalako Buchmann, Hugo Ekitike (CLEZBB)", null, 13800.0 + 1500 * EUR_USD],
  ["Flight Ticket – Dakar - Istanbul – 12.10.26 – Afiwa Grunitzky (TGECRA)", null, 1800.0 + 600 * EUR_USD],
  ["Flight Ticket – Dubai - Istanbul – 12.10.26 – Vanessa Derradji (F6GS6F)", null, 3300.0 + 712 * EUR_USD],
  ["Flight Ticket – Manchester - Dubai – 07.10.26 – Karl Mwalako Buchmann (M7343W)", null, 2400.0 + 738 * EUR_USD],
];

const items = ITEMS.map(([description, when, rawAmount, quantity, unitPrice]) => {
  const amount = Math.round(rawAmount * 100) / 100;
  return {
    description: when ? `${description}\n${when}` : description,
    quantity: quantity ?? 1,
    unit_price: unitPrice ?? amount,
    amount,
  };
});

// Arrondi au cent pour éviter les résidus flottants sur numeric(14,2).
const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;

const row = {
  invoice_number: INVOICE_NUMBER,
  label: LABEL,
  client_name: CLIENT_NAME,
  client_address: "N° 62125, Building Al\nDubai Digital Park, Dubai Silicon Oasis\nUnited Arab Emirates",
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
