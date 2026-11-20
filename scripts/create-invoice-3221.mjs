/**
 * Facture #3221 (Tan Gera) — prestations du 24 Aug au 16 Nov 2026 (Paris / Austin / Miami / Las Vegas / Seattle),
 * tout ce qui est postérieur à la #3030 réglée le 18 Aug — création ou mise à jour dans Supabase.
 * Total = balance WhatsApp du 09 Nov 2026 (41,042 usd, arrondie — exact US$ 41,041.86).
 *
 * Facture en USD. Les prestations partagées avec Salim sont coupées en deux
 * (l'autre moitié est sur la #3222). EUR convertis à 1.16 comme sur la #3030.
 *
 *   node scripts/create-invoice-3221.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3221.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3221;
const CLIENT_NAME = "Tan Gera";
const LABEL = `#${INVOICE_NUMBER}-TanGera`;
const INVOICE_DATE = "2026-10-30";
const CURRENCY = "USD";

/**
 * [description, date de prestation | null, montant USD]
 * La date part en 2e ligne de la description : la table du PDF n'a pas de
 * colonne date (cf. lib/pdf/generate.tsx).
 */
const ITEMS = [
  ["DXB - CDG - Emirates First Class EK073 (PNR QRRTIS)", "29 Aug 2026", 3890.0],
  ["Dubai VVIP Departure (Booking ID: 154763)", "29 Aug 2026", 900.0],
  ["Mercedes V-Class CDG - Paris 16e (Rue de l'Alboni)", "29 Aug 2026", 210.0],
  ["Private van transfer Vincennes - Salle Lokus Reception, Reau", "06 Sep 2026", 202.13],
  ["Van at disposal - Salle Lokus Reception, Reau, 3-hour minimum", "06-07 Sep 2026", 336.88],
  ["Cadillac Escalade AUS - Hyatt Place Four Points - Tan's share (shared transfer)", "08 Sep 2026", 105.0],
  ["Mercedes V-Class Paris 16e - CDG - Tan's share", "08 Sep 2026", 106.68],
  ["Cadillac Escalade Gatsby Mansion - AUS - Tan's share (shared transfer)", "11 Sep 2026", 140.0],
  ["SFO - DXB - Emirates First Class EK226 (PNR E3N3LF) - Tanuj Gera", "11 Sep 2026", 6850.0],
  ["DXB - MIA - Emirates (Ref. ETTC46) - Tanuj Gera", "04 Nov 2026", 4490.0],
  ["G-Wagon rental Miami, airport pick-up & return - Tan's share (total $5,040 ÷ 2)", "04-10 Nov 2026", 2520.0],
  ["DXB - LAX - Emirates (PNR JPQTSS) - Archana Arora Gera", "10 Nov 2026", 4590.0],
  ["LAX - LAS - Delta, front-row seat (Ref. GP3F48) - Archana Arora Gera", "10 Nov 2026", 280.0],
  ["Cadillac Escalade LAS - Bellagio - Archana Arora Gera", "10 Nov 2026", 180.0],
  ["Mercedes Sprinter LAS - Bellagio - Tan's share (total $165 ÷ 2)", "10 Nov 2026", 82.5],
  ["Bellagio, Las Vegas (NV) - Tanuj Gera", "10-16 Nov 2026", 6362.0],
  ["LAS - SEA - Delta - Tanuj Gera & Archana Arora Gera, 2 of 3 seats (total $3,145, Ref. GO6E2P)", "16 Nov 2026", 2096.67],
  ["SEA - DXB - Emirates (PNR JMSDUB) - Tan's share (total $7,700 ÷ 2)", "16 Nov 2026", 3850.0],
  ["SEA - DXB - Emirates (PNR LKSRSW) - Archana Arora Gera", "16 Nov 2026", 3850.0],
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
