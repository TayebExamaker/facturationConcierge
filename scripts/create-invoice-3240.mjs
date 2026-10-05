/**
 * Facture #3240 (Amandeep Singh Natt) — hôtels Dubai + vols nov. 2025 → sept. 2026,
 * en USD, moins l'acompte de 9 000 USD reçu en USDT le 30 Jan 2026.
 *
 *   node scripts/create-invoice-3240.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3240.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3240;
const CLIENT_NAME = "Amandeep Singh Natt";
const LABEL = `#${INVOICE_NUMBER}-AmandeepSinghNatt`;
const INVOICE_DATE = "2026-10-05";
const CURRENCY = "USD";

/** Déjà réglé : affiché en « Amount paid » et déduit (to_be_paid = total - payé). */
const AMOUNT_PAID = 9000.0;
const NOTES = "Payment received on 30 Jan 2026 (USDT): USD 9,000.00, thank you.";

/** [description, date de prestation | null, montant USD] */
const ITEMS = [
  ["Jumeirah Al Naseem, Dubai: stay extension, 2 nights", "24–26 Nov 2025", 3090.0],
  ["Flight Dubai (DXB) - London Stansted (STN), Emirates, Business Class, Mr Amandeep Natt (ref. EA7WVJ)", "26 Nov 2025", 2400.0],
  ["Flight London Heathrow (LHR) - Abu Dhabi (AUH), British Airways BA073, Club World, Mr Amandeep Natt (ref. 8P9MW7)", "26 Jan 2026", 2000.0],
  ["Jumeirah Al Naseem, Dubai: Ocean Deluxe Room, bed & breakfast, 4 nights (voucher WSH075633)", "27–31 Jan 2026", 3910.0],
  ["Jumeirah Al Naseem, Dubai: Ocean Deluxe Room, bed & breakfast, 1 night (voucher WSH076110)", "31 Jan–01 Feb 2026", 859.0],
  ["The Lana – Dorchester Collection, Dubai: Marina Room, bed & breakfast, 3 nights (voucher WSH076196)", "01–04 Feb 2026", 3171.0],
  ["The Lana – Dorchester Collection, Dubai: Marina Room, bed & breakfast, 2 nights (voucher WSH076544)", "04–06 Feb 2026", 2078.0],
  ["Flight Dubai (DXB) - London Gatwick (LGW), Emirates EK015, Business Class, Mr Amandeep Natt (ref. CEEDMB)", "10 Feb 2026", 2000.0],
  ["Flight London Gatwick (LGW) - Dubai (DXB), Emirates EK010, Business Class, Mr Amandeep Natt (ref. L8VNK6)", "21 Feb 2026", 2000.0],
  ["Armani Hotel Dubai: Armani Deluxe Room, bed & breakfast, 4 nights (voucher WSH078151)", "22–26 Feb 2026", 2445.0],
  ["Armani Hotel Dubai: Armani Deluxe Room, room only, 1 night (voucher WSH078654)", "26–27 Feb 2026", 550.0],
  ["Flight Abu Dhabi (AUH) - London Heathrow (LHR), Etihad, First Class, Mr Amandeep Natt (ref. 9ATQ3F)", "27 Feb 2026", 2500.0],
  ["Flight Dubai (DXB) - London Gatwick (LGW), Emirates, Business Class, Ms Ksenija Gorodnicka (ref. KLI446)", "31 Jul 2026", 2900.0],
  ["Flight Los Angeles (LAX) - Dubai (DXB), Emirates EK216, Business Class, Ms Leyna Trinh Tran (ref. EYGXHF)", "11 Sep 2026", 3500.0],
  ["Flight Dubai (DXB) - Los Angeles (LAX), Emirates EK215, Business Class, Ms Leyna Tran (ref. RRYDAB)", "20 Sep 2026", 3400.0],
];

const items = ITEMS.map(([description, when, amount, quantity, unitPrice]) => ({
  description: when ? `${description}\n${when}` : description,
  quantity: quantity ?? 1,
  unit_price: unitPrice ?? amount,
  amount,
}));

// Arrondi au cent pour éviter les résidus flottants sur numeric(14,2).
const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
const toBePaid = Math.round((total - AMOUNT_PAID) * 100) / 100;

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
  to_be_paid: toBePaid,
  notes: NOTES,
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
  console.log(`${items.length} lignes · total ${total.toFixed(2)} − payé ${AMOUNT_PAID.toFixed(2)} = ${toBePaid.toFixed(2)} ${CURRENCY}\n`);

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
