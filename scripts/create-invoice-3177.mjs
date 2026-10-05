/**
 * Facture #3177 (Alexandre Joude) — création ou mise à jour dans Supabase.
 *
 * Même logique que create-invoice-3162.mjs : écriture REST directe, ligne
 * identique à celle produite par `createInvoice()` (app/actions/invoices.ts).
 * Montants fournis en EUR convertis en USD au taux 1 EUR = 1.15 USD.
 *
 *   node scripts/create-invoice-3177.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3177.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3177;
const CLIENT_NAME = "Alexandre Joude";
const INVOICE_DATE = "2026-09-18";
const CURRENCY = "USD";

const EUR_TO_USD = 1.15;
/** Montant fourni en EUR → USD, arrondi au cent. */
const eur = (amount) => Math.round(amount * EUR_TO_USD * 100) / 100;

/**
 * [description, date de prestation | null, montant USD, quantité?, prix unitaire?]
 * La date part en 2e ligne de la description : la table du PDF n'a pas de
 * colonne date (cf. lib/pdf/generate.tsx).
 */
const ITEMS = [
  ["Hotel Brach Paris – Executive Room – 6 nights – Paris", "24–30 Jul 2026", 4916.57],
  [
    "Chauffeur – 49 Boulevard de Stalingrad, Thiais 94320 to Paris-CDG Airport",
    "30 Jul 2026",
    210.0,
  ],
  [
    "Airline tickets – Paris-CDG to Punta Cana – Business Class – 2 pax",
    "30 Jul 2026",
    6400.0,
    2,
    3200.0,
  ],
  ["Chauffeur – Punta Cana Airport to W Hotel – Punta Cana", "30 Jul 2026", 380.0],
  [
    "W Hotel Punta Cana – Supreme Suite, All-Inclusive Adults Only, 1 King, Ocean View (Non-Alcoholic All-Inclusive Package) – 6 nights",
    "30 Jul – 5 Aug 2026",
    7220.0,
  ],
  ["Chauffeur – W Hotel Punta Cana to Santo Domingo – Suburban", "4 Aug 2026", 380.0],
  [
    "Airline tickets – Santo Domingo to Providenciales – 2 pax + extra luggage (2 × 30 kg, 2 × 10 kg)",
    "5 Aug 2026",
    725.0,
  ],
  [
    "Chauffeur – Providenciales Airport to Grace Bay Club Hotel – Turks & Caicos",
    "5 Aug 2026",
    180.0,
  ],
  [
    "Grace Bay Club Hotel – Estate Junior Residence – Bed & Breakfast – Turks & Caicos",
    "5–10 Aug 2026",
    7643.0,
  ],
  [
    "Grace Bay Club Hotel – Estate Junior Residence – extension, 2 nights",
    "10–12 Aug 2026",
    2562.0,
  ],
  ["Airline tickets – Providenciales to Bahamas – 2 pax + extra baggage", "12 Aug 2026", 630.0],
  ["Chauffeur – Grace Bay Club Hotel to Providenciales Airport", "12 Aug 2026", 150.0],
  ["Chauffeur – Nassau Airport to Four Seasons Bahamas", "12 Aug 2026", 160.0],
  [
    "The Ocean Club, Four Seasons Bahamas – Luxury Oceanfront Room – 51 m² – Room Only",
    "10–15 Aug 2026",
    10755.0,
  ],
  [
    "The Ocean Club, Four Seasons Bahamas – Luxury Oceanfront Room – extension",
    "15–16 Aug 2026",
    3114.0,
  ],
  ["Hotel extras – The Ocean Club, Four Seasons Bahamas", "10–16 Aug 2026", 474.82],
  ["Chauffeur – Four Seasons Bahamas to Nassau Airport – private", "16 Aug 2026", 160.0],
  ["Private jet charter – Nassau to Miami – Citation VI – 2 pax", "16 Aug 2026", eur(5500)],
  ["Airline ticket – onward ticket for immigration purposes", "16 Aug 2026", 80.0],
  ["The Setai Hotel Miami – Studio Suite, Courtyard View", "15–19 Aug 2026", 2537.0],
  ["Chauffeur – Miami Airport to The Setai Hotel", "16 Aug 2026", 220.0],
  ["Chauffeur – Miami Airport to The Setai Hotel – driver for Caroline", "16 Aug 2026", 200.0],
  [
    "Car rental – Mercedes-AMG G 63 for Caroline – 2 days at 800 USD/day – Miami",
    "17–19 Aug 2026",
    1600.0,
    2,
    800.0,
  ],
  ["The Setai Hotel Miami – Studio Suite, Courtyard View – 2 nights", "19–21 Aug 2026", 1800.0],
  ["Airline ticket – onward ticket for immigration purposes", "17 Aug 2026", 80.0],
  ["Chauffeur – The Setai Hotel to Miami Airport (MIA) – Mercedes Sprinter", "21 Aug 2026", 300.0],
  [
    "Airline tickets – Miami (MIA) to Los Angeles (LAX) – 4 adults + 1 child – Economy – including extra luggage (290 USD) and seat selection (190 USD)",
    "21 Aug 2026",
    2840.0,
  ],
  ["Chauffeur – LAX Airport to The London West Hollywood – 2 Suburban", "21 Aug 2026", 400.0],
  ["The London West Hollywood – 2 Chelsea Suites – 69 sqm", "21–27 Aug 2026", 5800.0],
  ["Chauffeur – Hotel to private airport KVNY – 2 Suburban", "27 Aug 2026", 400.0],
  [
    "Private jet charter – Van Nuys (KVNY) to Teterboro (KTEB), New York",
    "27 Aug 2026",
    32000.0,
  ],
  ["Jet catering – not included in the empty-leg charter", "27 Aug 2026", 1621.0],
  [
    "Chauffeur – New York City drivers with Storm – 4 cars, long drive – 2 Cadillac, 2 Suburban",
    "27 Aug 2026",
    1600.0,
  ],
  [
    "Chauffeur – Teterboro Airport to Park Hyatt Hotel and New Jersey",
    "27 Aug 2026",
    500.0,
  ],
  ["Park Hyatt Hotel – 1 Bedroom – 1 night", "28–29 Aug 2026", 619.0],
  ["Park Hyatt Hotel – 1 Bedroom Suite, City View – 6 nights", "29 Aug – 4 Sep 2026", 10700.0],
  ["Park Hyatt Hotel – 1 Bedroom Suite, City View – extension, 1 night", "4–5 Sep 2026", 1900.0],
  ["Airline ticket – Air France – Ourida Si Chaib", "7 Sep 2026", 1838.0],
  ["Chauffeur – JFK Airport to hotel", "7 Sep 2026", 300.0],
  ["InterContinental New York Barclay – Premium Room, 1 King Bed", "6–12 Sep 2026", 5827.0],
  ["InterContinental New York Barclay – Premium Room, 1 King Bed", "7–12 Sep 2026", 5203.0],
  ["Hyatt Grand Central – Grand Loft Family – 1 night", "5 Sep 2026", 1900.0],
  [
    "InterContinental New York Barclay – Premium Room, 1 King Bed – extension, 2 rooms, 1 night",
    "12–13 Sep 2026",
    1337.0,
  ],
  [
    "InterContinental New York Barclay – Premium Room, 1 King Bed – extension, 2 rooms, 1 night",
    "13–14 Sep 2026",
    1166.0,
  ],
  ["Chauffeur – InterContinental Hotel to JFK Airport", "14 Sep 2026", 300.0],
  ["Chauffeur – Paris-CDG to 49 Boulevard de Stalingrad, Thiais 94320", "14 Sep 2026", eur(180)],
  ["Airline ticket – Madrid to Dubai – Business Class Saver – 1 pax", null, 2300.0],
  [
    "Airline ticket – Dubai to Madrid – Economy Flex round trip + extra luggage",
    "6–13 Sep 2026",
    1283.0,
  ],
  [
    "Airline ticket – Valencia to Madrid – Iberia + 32 kg luggage – Ms Rosa Lorena Rivero Garcia",
    "4 Sep 2026",
    520.26,
  ],
  ["Chauffeur – Madrid to Valencia – V-Class", null, 830.74],
  [
    "Chauffeur – Viano V-Class extra long, lounge configuration – 10 hours – Valencia",
    "10 Sep 2026",
    eur(900),
  ],
  [
    "Chauffeur – Viano V-Class extra long, lounge configuration – 6 hours – Valencia",
    "11 Sep 2026",
    621.0,
  ],
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
  label: `#${INVOICE_NUMBER}-AlexandreJoude`,
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
