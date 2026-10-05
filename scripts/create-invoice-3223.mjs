/**
 * Facture #3223 (Arman Arzumanyan) — vols et hôtels du 03 Aug au 01 Oct 2026
 * pour Arman et ses proches — création ou mise à jour dans Supabase.
 *
 *   node scripts/create-invoice-3223.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3223.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3223;
const CLIENT_NAME = "Arman Arzumanyan";
const LABEL = `#${INVOICE_NUMBER}-ArmanArzumanyan`;
const INVOICE_DATE = "2026-10-01";
const CURRENCY = "USD";

/**
 * [description, date de prestation | null, montant USD]
 * La date part en 2e ligne de la description : la table du PDF n'a pas de
 * colonne date (cf. lib/pdf/generate.tsx).
 */
const ITEMS = [
  ["Flight ticket – Dubai (DXB) to Nice (NCE) – Arman Arzumanyan", "03 Aug 2026", 4000.0],
  ["Jumeirah Al Naseem – Stay extension – 7 nights – Vialetta Mamatkazina", "05–12 Aug 2026", 3937.0],
  ["Villa Cosy, Saint-Tropez – Junior Suite – 2 nights – Ksenia Gurin", "10–12 Aug 2026", 5037.0],
  ["Yacht charter with crew – Cannes – 11:30 to 19:30 (8 h) – 8 guests", "12 Aug 2026", 7187.5],
  ["Helicopter transfer – Mykonos to Athens", "17 Aug 2026", 2012.5],
  ["Flight ticket – Business Class – Athens (ATH) to Dubai (DXB) – Arman Arzumanyan", "17 Aug 2026", 2600.0],
  ["Flight ticket – Moscow (DME) to Dubai (DXB) – Elena Medvedeva", "11 Sep 2026", 2300.0],
  ["The Lana, Dorchester Collection – Dubai – Elena Medvedeva", "11–21 Sep 2026", 4884.0],
  ["The Lana, Dorchester Collection – Dubai – Stay extension – Elena Medvedeva", "21 Sep–01 Oct 2026", 5100.0],
  ["Flight ticket – Moscow (VKO) to Naples (NAP) to Moscow (VKO) – Olesia Loginova", "21–26 Sep 2026", 5800.0],
  ["Santa Caterina, Amalfi – 5 nights – Olesia Loginova", "21–26 Sep 2026", 17225.0],
  ["Flight ticket – Moscow (DME) to Dubai (DXB) – Vialetta Mamatkazina", "27 Sep 2026", 4000.0],
  ["Flight ticket – Abu Dhabi (AUH) to Moscow (SVO) – Elena Medvedeva", "01 Oct 2026", 1450.0],
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
