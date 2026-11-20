/**
 * Facture #3385 (William Cohen) — hôtels & vols avr.-oct. 2026, sans noms des voyageurs. En EUR.
 *
 *   node scripts/create-invoice-3385.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3385.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3385;
const CLIENT_NAME = "William Cohen";
const LABEL = `#${INVOICE_NUMBER}-WilliamCohen`;
const INVOICE_DATE = "2026-10-09";
const CURRENCY = "EUR";

/** [description, date | null, montant EUR] — sans les noms des voyageurs */
const ITEMS = [
  ["Flight Miami - San Francisco", "01.04.26", 1075.86],
  ["The St. Regis San Francisco (01 – 05 Apr 2026)", "01.04.26", 2423.28],
  ["The St. Regis San Francisco (05 – 06 Apr 2026)", "04.04.26", 586.21],
  ["The St. Regis San Francisco (06 – 09 Apr 2026)", "05.04.26", 3512.93],
  ["Flight San Francisco - Palm Springs", "09.04.26", 921.55],
  ["The St. Regis San Francisco (14 – 15 Apr 2026)", "12.04.26", 1141.38],
  ["Waldorf Astoria Beverly Hills (13 – 14 Apr 2026)", "13.04.26", 1021.55],
  ["Waldorf Astoria Beverly Hills (13 – 14 Apr 2026)", "13.04.26", 1200.00],
  ["Ibiza Gran Hotel (27 – 29 Apr 2026)", "21.04.26", 1677.59],
  ["Ibiza Gran Hotel (24 – 26 Apr 2026)", "21.04.26", 2741.38],
  ["Flight Amsterdam - Ibiza - Amsterdam", "25.04.26", 886.06],
  ["Lufthansa RAK - FRA + FRA - PRG", "25.04.26", 1102.73],
  ["Hotel Martinez, Unbound Collection by Hyatt (20 – 23 May 2026)", "26.04.26", 9321.65],
  ["Ibiza Gran Hotel (01 – 05 May 2026)", "27.04.26", 2375.00],
  ["Ibiza Gran Hotel (29 – 30 Apr 2026)", "29.04.26", 1377.59],
  ["Flight Ibiza - Madrid", "01.05.26", 2210.13],
  ["Hotel Martinez (19 – 20 May 2026)", "02.05.26", 887.93],
  ["Hotel Martinez (19 – 21 May 2026)", "02.05.26", 1775.86],
  ["Ibiza Gran Hotel (05 – 07 May 2026)", "05.05.26", 1120.69],
  ["Ibiza Gran Hotel (05 – 07 May 2026)", "05.05.26", 1534.48],
  ["Iberia RAK - IBZ Business", "10.05.26", 609.48],
  ["Flight VIE - PRG Business", "10.05.26", 790.53],
  ["Flight Vienna - Geneva", "10.05.26", 925.62],
  ["Easyjet RAK - GVA", "10.05.26", 1060.71],
  ["Ibiza Gran Hotel (11 – 13 May 2026)", "11.05.26", 2237.93],
  ["Guest Extras", "16.05.26", 571.55],
  ["The David Kempinski Tel Aviv (16 – 18 May 2026)", "16.05.26", 1355.17],
  ["The Hari Hotel (18 – 20 May 2026)", "16.05.26", 1400.86],
  ["Flight Nice - Dubai", "24.05.26", 2060.34],
  ["Ibiza Gran Hotel (02 – 03 Jun 2026)", "29.05.26", 2237.93],
  ["Ibiza Gran Hotel - Junior Suite (05 – 06 Jun 2026)", "05.06.26", 1084.12],
  ["Flight Dubai - Moscow (one-way)", "10.06.26", 1982.76],
  ["Ibiza Gran Hotel - Junior Suite (16 – 18 Jun 2026)", "16.06.26", 1084.12],
  ["Ibiza Gran Hotel - Junior Suite (16 – 17 Jun 2026)", "16.06.26", 1084.12],
  ["Flight", "17.06.26", 956.42],
  ["Lufthansa flight to Berlin", "19.06.26", 880.47],
  ["Hotel Adlon Kempinski Berlin - Executive Room (20 – 22 Jun 2026)", "20.06.26", 644.83],
  ["Hotel Adlon Kempinski Berlin - Executive Suite (20 – 22 Jun 2026)", "20.06.26", 1760.34],
  ["Hotel Metropole Geneva (28 – 30 Jun 2026)", "27.06.26", 6537.93],
  ["Flight Geneva - Nice", "08.07.26", 1149.17],
  ["Flight Paris - Geneva", "09.07.26", 946.14],
  ["Flight Madrid - Tel Aviv (26 Jul 2026)", "12.07.26", 1280.39],
  ["Flight Nice - Vienna", "16.07.26", 2140.68],
  ["Kube Saint-Tropez (16 – 17 Jul 2026) · Ref. WSH094250", "16.07.26", 2364.66],
  ["Hotel Chateau Rose", "17.07.26", 1379.31],
  ["Gran Ibiza", "26.07.26", 1785.34],
  ["Gran Ibiza", "26.07.26", 1951.72],
  ["Hotel Rothschild 22 · Ref. WSH095771", "28.07.26", 999.14],
  ["Flight Ibiza - Tel Aviv", "28.07.26", 1125.00],
  ["London - Olbia (30 Jul) / Olbia - London (2 Aug) · Ref. VMGRXG / ZX4PKZ", "30.07.26", 1260.88],
  ["Tel Aviv - Dubai (03 Aug 2026) · Ref. KA8XKT", "02.08.26", 1105.48],
  ["Vienna - Ibiza (5 Aug) / Ibiza - Vienna (11 Aug) - Austrian · Ref. 8VVARW", "02.08.26", 2272.24],
  ["Olbia - Barcelona - Ibiza - Iberia (3 Aug) · Ref. NJ6VD", "03.08.26", 592.84],
  ["Dubai - Ibiza (06 Aug 2026) · Ref. E3LRYS", "04.08.26", 780.28],
  ["Ibiza Gran Hotel - extras (6 Aug) · Ref. WSH097503", "06.08.26", 1982.76],
  ["Ibiza - Nice - Iberia (11 Aug) · Ref. HZ5VF", "10.08.26", 492.72],
  ["BLESS Ibiza Cala Nova (10 – 11 Aug) · Ref. WSH097850", "10.08.26", 825.00],
  ["Figari (Corsica) - Geneva (17 Aug 2026) · Ref. KD5HZKD", "11.08.26", 487.76],
  ["Madrid - Ibiza - Air Europa (12 Aug) · Ref. 40-1068643525", "12.08.26", 475.86],
  ["Ibiza - Paris CDG - Air France (13 Aug) · Ref. XE3UZE", "13.08.26", 740.56],
  ["Ibiza Gran Hotel (13 Aug) · Ref. GHI-6929-2026", "13.08.26", 2181.03],
  ["BLESS Hotel Ibiza (14 Aug) · Ref. WSH097503", "14.08.26", 1126.01],
  ["Nobu Hotel Ibiza Bay · Ref. WSH098974", "17.08.26", 1900.86],
  ["Munich - Ibiza - Lufthansa (22 Aug 2026) · Ref. ZHCN2Z", "22.08.26", 575.00],
  ["Ibiza - Munich - Discover Airlines (24 Aug 2026)", "24.08.26", 771.00],
  ["The Ritz-Carlton Lake Tahoe (08 – 09 Sep 2026) · Ref. WSH101944", "08.09.26", 810.34],
  ["The Ritz-Carlton Lake Tahoe (08 – 09 Sep 2026) · Ref. WSH101947", "08.09.26", 1101.72],
  ["Reno - Paris - Delta", "09.09.26", 900.86],
  ["The St. Regis San Francisco (09 – 11 Sep 2026) · Ref. WSH102090", "09.09.26", 1927.59],
  ["The St. Regis New York (11 – 14 Sep 2026) · Ref. 90688915", "11.09.26", 7758.62],
  ["New York JFK - Dubai - Qatar Airways (14 Sep 2026) · Ref. 9C768O", "13.09.26", 2586.21],
  ["New York JFK - Dubai - Qatar Airways (14 Sep 2026) · Ref. 9C6QGH", "13.09.26", 2586.21],
  ["Ibiza - Prague (22 Sep 2026)", "17.09.26", 1284.80],
  ["Abu Dhabi - Paris CDG - Etihad (01 Oct 2026) · Ref. 9DDYDT", "19.09.26", 5344.83],
  ["Dubai - Tokyo Narita - Emirates (18 Oct 2026) · Ref. DL6AL2", "25.09.26", 2231.45],
  ["Jumeirah Dubai (25 Sep 2026)", "25.09.26", 3294.92],
  ["Ibiza Gran Hotel (06 – 07 Oct 2026) · Ref. WSH105682", "04.10.26", 801.72],
  ["Ibiza Gran Hotel (06 – 07 Oct 2026) · Ref. WSH105679", "04.10.26", 1293.10],
  ["Tel Aviv - Boston - Lufthansa (11 Oct 2026)", "04.10.26", 1585.00],
  ["Madrid - Ibiza - Iberia (06 Oct 2026) · Ref. HGF6P", "05.10.26", 566.49],
  ["Ibiza Gran Hotel (06 – 08 Oct 2026) · Ref. WSH105891", "05.10.26", 1633.62],
  ["Ibiza - London Heathrow - British Airways (09 Oct 2026) · Ref. ZOFAK5", "07.10.26", 845.05],
  ["Ibiza Gran Hotel (08 – 09 Oct 2026) · Ref. WSH106303", "08.10.26", 905.17],
  ["Nobu Hotel Ibiza Bay (11 – 14 Oct 2026) · Ref. WSH106390", "08.10.26", 2590.52],
  ["Munich - Palma de Mallorca - Lufthansa (09 Oct 2026) · Ref. 74BRZU", "09.10.26", 649.00],
  ["Milan - Dubai - Milan - Emirates (21 – 28 Oct 2026)", "09.10.26", 4319.49],
  ["Ibiza Gran Hotel", "10.10.26", 1380.00],
  ["Nobu Hotel Ibiza Bay (11 – 13 Oct 2026) · Ref. WSH106681", "11.10.26", 2241.38],
  ["Ibiza - Dusseldorf - Eurowings (13 Oct 2026) · Ref. VHMTVV", "12.10.26", 511.00],
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
