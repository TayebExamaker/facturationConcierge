/**
 * Facture #3386 (William Cohen) — hôtels & vols avr.-août 2026, sans noms des voyageurs. En EUR.
 *
 *   node scripts/create-invoice-3386.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3386.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3386;
const CLIENT_NAME = "William Cohen";
const LABEL = `#${INVOICE_NUMBER}-WilliamCohen`;
const INVOICE_DATE = "2026-09-05";
const CURRENCY = "EUR";

/** [description, date | null, montant EUR] — sans les noms des voyageurs */
const ITEMS = [
  ["Ibiza Gran Hotel (26 Apr – 01 May 2026)", "04.04.26", 4086.21],
  ["Ibiza Gran Hotel (26 Apr – 01 May 2026)", "04.04.26", 5039.66],
  ["Flight San Francisco - Dubai", "06.04.26", 11206.90],
  ["Waldorf Astoria Beverly Hills (10 – 13 Apr 2026)", "10.04.26", 3007.76],
  ["Amanjena (07 – 10 May 2026)", "18.04.26", 14725.00],
  ["Flight Abu Dhabi - Ibiza", "19.04.26", 2586.21],
  ["Ibiza Gran Hotel (24 – 26 Apr 2026)", "21.04.26", 3268.10],
  ["Ibiza Gran Hotel (01 – 05 May 2026)", "27.04.26", 3270.69],
  ["Hotel Martinez (23 – 26 May 2026)", "02.05.26", 2663.79],
  ["Amanjena (10 – 11 May 2026)", "10.05.26", 5129.31],
  ["Ibiza Gran Hotel (02 – 12 Aug 2026)", "29.05.26", 26801.72],
  ["Ibiza Gran Hotel (13 – 16 May 2026)", "31.05.26", 4073.28],
  ["Ibiza Gran Hotel - Luxe Room (13 – 16 Jun 2026)", "13.06.26", 4025.86],
  ["Ibiza Gran Hotel (23 – 26 Jul 2026)", "12.07.26", 5258.62],
  ["Hotel · Ref. WSH095196", "23.07.26", 5353.45],
  ["Gran Ibiza", "26.07.26", 3334.48],
  ["Gran Ibiza", "26.07.26", 5247.41],
  ["Ibiza Gran Hotel (04 – 13 Aug, 9 nights) · Ref. GHI-6393-2026", "31.07.26", 16267.24],
  ["Ibiza Gran Hotel - extras (3 Aug) · Ref. WSH097503", "03.08.26", 2478.45],
  ["Gran Hotel Ibiza (06 – 10 Aug 2026) · Ref. GHI-6597-2026", "05.08.26", 7038.79],
  ["Flight Paris - San Francisco (1 Sep) · Ref. XEKV6P", "11.08.26", 6724.14],
  ["Ibiza Gran Hotel (13 – 14 Aug) · Ref. WSH098182", "12.08.26", 3106.03],
  ["Ibiza Gran Hotel · Ref. WSH098951", "17.08.26", 2462.07],
  ["Flight Paris CDG - San Francisco - Air France · Ref. XPDJJ8", "18.08.26", 2844.83],
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
