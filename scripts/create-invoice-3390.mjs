/**
 * Facture #3390 (Gims) — reprise intégrale du SOA du 14 Nov 2026
 * (29 Jan - 14 Nov 2026) — création ou mise à jour dans Supabase.
 * SOA : 122 lignes, US$ 599,745.94. Retirées le 18 Nov 2026 (doublons) :
 *   - EK071/EK072 Dubai - Paris - Dubai, 08-10 May, 8 400 $ (inclus dans « Gandhi Djuna + 4 » 20 554 $)
 *   - Abu Dhabi - Paris, Etihad, 11 Apr, 4 827 $ (déjà dans 2 × 2 700 $ + The Residence 2 192 $)
 * → 120 lignes, US$ 586,518.94, aucun paiement reçu.
 *
 * Lignes générées depuis SOA_gims_2026-11-14 (3).pdf (version révisée), soldes cumulés vérifiés ligne à ligne.
 *
 *   node scripts/create-invoice-3390.mjs          # crée, ou met à jour si le n° existe
 *   node scripts/create-invoice-3390.mjs --dry    # affiche les lignes, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const INVOICE_NUMBER = 3390;
const CLIENT_NAME = "Gims";
const LABEL = `#${INVOICE_NUMBER}-Gims`;
const INVOICE_DATE = "2026-11-14";
const CURRENCY = "USD";

/** [description, "passager(s) - date de voyage (date de réservation)", montant USD] */
const ITEMS = [
  ["VIA JULIAN - Flight: Geneva - Miami","Adja Damba Dante, Silvia Garcia Vilar - 29 Jan 2026",3000],
  ["VIA JULIAN - Flight: Paris - Phuket, Cathay Pacific","Ryan Garba Takof - 31 Jan 2026",793],
  ["VIA JULIAN - Flight: Paris - Dubai, Emirates","Fatima Fatah - 03 Feb 2026",2500],
  ["VIA JULIAN - Flight: Frankfurt - Dubai, Emirates","Antonela Crnac - 05 Feb 2026",3400],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris, Etihad","Fatima Fatah - 06 Feb 2026",1600],
  ["VIA JULIAN - Flight: Casablanca - Dubai, Emirates","Gandhi Djuna - 14 Feb 2026",3400],
  ["VIA JULIAN - Flight: Paris - Abu Dhabi, Etihad","Audrey Desiles - 14 Feb 2026",2500],
  ["VIA JULIAN - Flight: Paris - Dubai, Emirates","Idriss Djuna - 15 Feb 2026",2100],
  ["VIA JULIAN - Flight: Paris - Abu Dhabi, Etihad","Melany Presa Marques - 15 Feb 2026",2590],
  ["VIA JULIAN - Flight: Dusseldorf - Dubai, Emirates","Amara Diaoune - 15 Feb 2026",3400],
  ["VIA JULIAN - Flight: Abu Dhabi - Frankfurt, Etihad, 2 passengers","Amara Diaoune, Louisa Johanna Eleonora Godehardt - 20 Feb 2026",2300],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris, Etihad","Idriss Djuna - 23 Feb 2026",2300],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris, Etihad","Audrey Desiles - 27 Feb 2026",2500],
  ["VIA JULIAN - Flight: Paris - Dubai, Emirates","Idriss Djuna - 17 Mar 2026",2070],
  ["VIA JULIAN - Flight: Dubai - Paris, Emirates","Idriss Djuna - 22 Mar 2026",2070],
  ["VIA JULIAN - Flight: Dubai - Paris, Emirates","Gandhi Djuna - 25 Mar 2026",3450],
  ["VIA JULIAN - Flight: Frankfurt - Abu Dhabi - Frankfurt, Etihad","Emanuel Ahr - 02 - 10 Apr 2026 (booked 02 Apr 2026)",2885],
  ["VIA JULIAN - Flight: Paris - Dubai, Emirates","Gandhi Djuna - 03 Apr 2026",3450],
  ["VIA JULIAN - Flight: Dubai - Frankfurt, Emirates","Ana Crnac - 05 Apr 2026",2000],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris, Etihad, 2 passengers","Gandhi Djuna, Idriss Djuna - 11 Apr 2026",5400],
  ["VIA JULIAN - Etihad The Residence: Abu Dhabi - Paris","Gandhi Djuna - 11 Apr 2026",2192],
  ["VIA JULIAN - Flight: Abu Dhabi - Casablanca, Etihad, 2 passengers","Junior Djafi Djuna, Assia Khadija Djuna - 14 Apr 2026",2900],
  ["VIA JULIAN - Flight: Dubai - Paris CDG, Emirates EK075 First Class","Gandhi Djuna - 17 Apr 2026",3399],
  ["VIA JULIAN - Flight: Dubai - Paris, Emirates","Idriss Djuna - 18 Apr 2026",2350],
  ["VIA JULIAN - Flight: Paris - Abu Dhabi, Etihad","Gandhi Djuna - 20 Apr 2026",2900],
  ["VIA JULIAN - Flight: Dubai - Brussels, Emirates EK181 First Class","Gandhi Djuna - 24 Apr 2026",3800],
  ["VIA JULIAN - Flight: Casablanca - Abu Dhabi, Etihad, 2 passengers","Junior Djuna, Assia Khadija Djuna - 25 Apr 2026",3200],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris - Abu Dhabi, Etihad","Guy Herve Imboua - 26 - 30 Apr 2026 (booked 26 Apr 2026)",3000],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris, Etihad, 2 passengers","Junior Djuna, Ninelle Djuna - 29 Apr 2026",3200],
  ["VIA JULIAN - Flight: Paris - Dubai - Paris, Emirates, 5 passengers","Gandhi Djuna + 4 - 08 - 10 May 2026 (booked 08 May 2026)",20554],
  ["VIA JULIAN - Flight: Dubai - London, Emirates","Antonela Crnac - 19 May 2026",3450],
  ["VIA JULIAN - Flight: Dubai - Paris, Emirates, 2 passengers","Gandhi Djuna, Julian Zimmer - 20 May 2026",6900],
  ["VIA JULIAN - Flight: Dubai - Miami","20 May 2026",2800],
  ["VIA JULIAN - Flight: Dubai - Casablanca, Emirates, 2 passengers","Aisha Djuna, Yahya Djuna - 21 May 2026",6060],
  ["VIA JULIAN - Flight: Paris - Dubai, Emirates","Gandhi Djuna - 24 May 2026",3450],
  ["VIA JULIAN - Flight: Frankfurt - Dubai, Emirates","Antonela Crnac - 26 May 2026",3240],
  ["VIA JULIAN - Flight: Dubai - Tokyo, Emirates First Class, 2 passengers (Ref. GGVUGF)","Gandhi Djuna, Antonela Crnac - 28 May 2026",9000],
  ["VIA JULIAN - Flight: Tokyo - Dubai - Casablanca, Emirates First Class (Ref. FD5KF2)","Gandhi Djuna - 05 Jun 2026",7000],
  ["VIA JULIAN - Flight: Tokyo - Dubai, Emirates First Class (Ref. BY58UW)","Antonela Crnac - 05 Jun 2026 (booked 04 Jun 2026)",4500],
  ["VIA JULIAN - Cancellation fee: Flight Copenhagen - Abu Dhabi, Etihad","Gandhi Djuna - Booked 07 Jun 2026",270],
  ["VIA JULIAN - Flight: Casablanca - Dubai, Emirates EK752 First Class","Gandhi Djuna - 07 Jun 2026",4552],
  ["VIA JULIAN - Flight: Dubai - Paris CDG, Emirates First Class","Gandhi Djuna - 11 Jun 2026",3450],
  ["VIA JULIAN - Flight: Abu Dhabi - Paris - Dubai, First Class / Business Class","Manbaye Sow - 15 - 19 Jun 2026 (booked 15 Jun 2026)",5200],
  ["VIA JULIAN - Change fee: return flight moved from 18 Jun to 19 Jun 2026","Manbaye Sow - Booked 18 Jun 2026",229.7],
  ["VIA RAF - Flight: Dubai - Paris, Emirates First Class (26 Jun 2026) + Dubai - Paris - Dubai (26 - 28 Jun 2026), 2 passengers","Manbaye Sow, Aliyha Alwan Omar - Booked 21 Jun 2026",10250],
  ["VIA JULIAN - Flight: Nice - Dubai, Emirates First Class","Gandhi Djuna - 22 Jun 2026",3450],
  ["VIA LAURENCE - Flight: Casablanca - Dubai, Emirates Business Class, 3 passengers","Adja-Damba M.-J. Dante, Haby Djuna, Yahya Djuna - Booked 23 Jun 2026",6600],
  ["VIA SYLVIA - Flight: Paris - New York - Paris, Air France La Première","Gandhi Djuna - Booked 25 Jun 2026",15200],
  ["VIA SYLVIA - Flight: Paris - New York, Air France Business Class","Manbaye Sow - 28 Jun 2026",2700],
  ["VIA SYLVIA - Flight: New York - Paris, Air France Business Class","Manbaye Sow - 29 Jun 2026",3200],
  ["VIA SYLVIA - Park Hyatt New York: Grand Suite, 6 nights","Gandhi Djuna - 30 Jun - 06 Jul 2026 (booked 30 Jun 2026)",13000],
  ["VIA SYLVIA - Park Hyatt New York: Standard Room, 6 nights","Aisha Lalla Djuna - 30 Jun - 06 Jul 2026 (booked 30 Jun 2026)",6000],
  ["VIA SYLVIA - Park Hyatt New York: Standard Room, 6 nights","Diedi Camara - 30 Jun - 06 Jul 2026 (booked 30 Jun 2026)",6000],
  ["VIA SYLVIA - One&Only Kea Island: Cliff Villa Panoramic Sea View, 5 nights","Antonela Crnac - Booked 30 Jun 2026",17500],
  ["VIA SYLVIA - W Sardinia - Poltu Quatu: Deluxe Suite, 5 nights","Antonela Crnac - Booked 02 Jul 2026",17770],
  ["VIA SYLVIA - Mandarin Oriental Bodrum: One Bedroom Sea View Apartment, 5 nights","Antonela Crnac - 21 - 26 Jul 2026 (booked 02 Jul 2026)",17430],
  ["VIA SYLVIA - Hôtel de Paris Monte-Carlo: 2 Junior Suites Sea View, 5 nights","Antonela Crnac, Troy Yarwood - 13 - 18 Jul 2026 (booked 03 Jul 2026)",45200],
  ["VIA SYLVIA - Flight: Paris - Dubai, Emirates Business Class, 2 passengers (Ref. LVEWBJ)","Zizi Hofwijks, Manbaye Sow - 10 Jul 2026 (booked 08 Jul 2026)",4600],
  ["VIA LAURENCE - Hôtel Martinez: Cannes, King Room, 3 nights","Brahim Boudjouraf - 13 - 16 Jul 2026 (booked 10 Jul 2026)",3000],
  ["VIA SYLVIA - Hôtel Martinez: Cannes, 3 nights","Brahim Boudjouraf - 18 - 21 Jul 2026 (booked 17 Jul 2026)",4830],
  ["VIA SYLVIA - Mandarin Oriental Lago di Como: Panoramic Suite with Private Pool, 3 nights","Gandhi Djuna - Booked 21 Jul 2026",45107],
  ["VIA SYLVIA - Flight: Dubai - Paris, Emirates Business Class (Ref. RMLEGW)","Manbaye Sow - 26 Jul 2026 (booked 24 Jul 2026)",2200],
  ["VIA LAURENCE - Flight: Frankfurt - Dubai, Emirates First Class (Ref. JAHMSN)","Antonela Crnac - 03 Aug 2026",3967.5],
  ["VIA SYLVIA - Carlton Cannes, a Regent Hotel: Suite 1 Bedroom Sea View, 2 nights","Gandhi Djuna - 07 - 09 Aug 2026 (booked 06 Aug 2026)",10500],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates First Class (Ref. FJQAYE)","Gandhi Djuna - 23 Aug 2026 (booked 15 Aug 2026)",3500],
  ["VIA LAURENCE - Flight: Frankfurt - Dubai, Emirates First Class (Ref. FQVVQW)","Antonela Crnac - 18 Aug 2026 (booked 17 Aug 2026)",4000],
  ["VIA RAF - Flight: Dubai - Madrid, Emirates Business Class (Ref. HNJMPB)","Hind Yurrita Hatab - 31 Aug 2026 (booked 19 Aug 2026)",2300],
  ["VIA SYLVIA - Flight: Paris - Abu Dhabi, Etihad The Residence, 2 passengers (Ref. 7PAUOL)","Gandhi Djuna, Catharina Gama de Morais - 28 Aug 2026 (booked 23 Aug 2026)",9987.47],
  ["VIA SYLVIA - Flight: Dubai - Paris, Emirates (Ref. E45SD2)","Evelyn Lagos Fagundes - 02 Sep 2026 (booked 23 Aug 2026)",2099.82],
  ["VIA SYLVIA - Flight: Abu Dhabi - Paris, Etihad (Ref. XJS7SI)","Catharina Gama de Morais - 07 Sep 2026 (booked 23 Aug 2026)",1749.85],
  ["VIA SYLVIA - Flight: Paris - Dubai, Emirates Business Class (Ref. RRSEHJ)","Manbaye Sow - 28 Aug 2026 (booked 24 Aug 2026)",2300],
  ["VIA LAURENCE - Flight: Dubai - Madrid, Emirates (Ref. KVI8X2)","Hind Yurrita Hatab - 03 Sep 2026 (booked 01 Sep 2026)",2300],
  ["VIA LAURENCE - Park Hyatt Istanbul - Maçka Palas: 6 nights","Leila Tires - 12 - 18 Sep 2026 (booked 07 Sep 2026)",2565],
  ["VIA SYLVIA - InterContinental Madinah - Dar Al Iman: Presidential Suite Haram View, 5 nights","Gandhi Djuna - 13 - 18 Sep 2026 (booked 10 Sep 2026)",5350],
  ["VIA SYLVIA - Flight: Dubai - Medina - Dubai, Emirates (Ref. L3B73J)","Gandhi Djuna - 13 - 17 Sep 2026 (booked 10 Sep 2026)",2000],
  ["VIA SYLVIA - Flight: Paris - Abu Dhabi - Paris, Etihad Business Class (Ref. XIX9A5 / XIY53Z)","Senny Vahe Ohannessian - 15 - 22 Sep 2026 (booked 10 Sep 2026)",3132],
  ["VIA SYLVIA - Change of return flight date: Medina - Dubai (Ref. L3B73J)","Gandhi Djuna - Booked 17 Sep 2026",350],
  ["VIA LAURENCE - InterContinental Madinah - Dar Al Iman: Presidential Suite Haram View, 1 night","Gandhi Djuna - 18 - 19 Sep 2026 (booked 17 Sep 2026)",1224],
  ["VIA SYLVIA - Park Hyatt Istanbul - Maçka Palas: extension, 1 night","Leila Tires - 18 - 19 Sep 2026 (booked 18 Sep 2026)",500],
  ["VIA SYLVIA - Flight: Istanbul - Casablanca, Turkish Airlines Business Class, 2 passengers (Ref. VSS3EN)","Leila Tires, Hafida El Yassini - 19 Sep 2026 (booked 18 Sep 2026)",3000],
  ["VIA LAURENCE - InterContinental Madinah - Dar Al Iman: late check-out","Gandhi Djuna - 19 Sep 2026",140],
  ["VIA LAURENCE - InterContinental Madinah - Dar Al Iman: Presidential Suite Haram View, 3 nights","Gandhi Djuna - 28 Sep - 01 Oct 2026 (booked 22 Sep 2026)",3000],
  ["VIA LAURENCE - Flight: Dubai - Medina - Dubai, Emirates (Ref. NW8LGS / LZXS3F)","Gandhi Djuna - 28 Sep - 01 Oct 2026 (booked 22 Sep 2026)",2000],
  ["VIA LAURENCE - Flight: Dubai - Medina - Dubai, Emirates (Ref. PMS8QB / RDPD6F)","Dadju Nsungula - 28 Sep - 01 Oct 2026 (booked 22 Sep 2026)",2000],
  ["VIA SYLVIA - Change fee: return flight Abu Dhabi - Paris moved from 22 Sep to 02 Oct 2026 (Ref. XBFLZX)","Senny Vahe Ohannessian - Booked 22 Sep 2026",400],
  ["VIA SYLVIA - InterContinental Madinah - Dar Al Iman: Presidential Suite Haram View, 3 nights","Dadju Nsungula - 28 Sep - 01 Oct 2026 (booked 23 Sep 2026)",3000],
  ["VIA LAURENCE - Flight: Dubai - Jeddah - Dubai, Emirates First Class, 2 passengers (Ref. BWWPU3)","Melanie Georgiades, Faouzi Tarkhani - 26 - 28 Sep 2026 (booked 24 Sep 2026)",5800],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates First Class (Ref. LYFAQN)","Gandhi Djuna - 07 Oct 2026 (booked 26 Sep 2026)",3800],
  ["VIA LAURENCE - Flight: Abu Dhabi - Paris, Etihad First Class (Ref. 72QUZQ)","Antonela Crnac - 04 Oct 2026 (booked 03 Oct 2026)",3200],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates Business Class, upgrade included (Ref. CMF3Z2)","Brahim Boudjouraf - 07 Oct 2026 (booked 04 Oct 2026)",3444],
  ["VIA LAURENCE - Flight: Frankfurt - Dubai, Emirates (Ref. BPCSPP)","Antonela Crnac - 09 Oct 2026 (booked 08 Oct 2026)",4000],
  ["VIA LAURENCE - Flight: Paris - Abu Dhabi, Etihad, 2 passengers","12 Oct 2026",6200],
  ["VIA LAURENCE - Residence: 2 guests","Oct 2026 (booked 12 Oct 2026)",4640],
  ["VIA SYLVIA - Flight: Abu Dhabi - Paris, Etihad (Ref. ZOMF8X)","Faouzi Tarkhani - 16 Oct 2026 (booked 14 Oct 2026)",1234.07],
  ["VIA SYLVIA - Flight: Paris - Dubai, Emirates First Class (Ref. QS2HX6)","Faouzi Tarkhani - 20 Oct 2026 (booked 14 Oct 2026)",4265.93],
  ["VIA LAURENCE - Flight: Frankfurt - Dubai, Emirates Business Class (Ref. ICSJLW)","Ana Crnac - 27 Oct 2026 (booked 23 Oct 2026)",2300],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates First Class (Ref. LH8XU6)","Gandhi Djuna - 26 Oct 2026 (booked 23 Oct 2026)",3700],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates Business Class, 2 passengers (Ref. IPN5EB)","Idriss Djuna, Jason Traore - 26 Oct 2026 (booked 24 Oct 2026)",4600],
  ["VIA LAURENCE - Flight: Paris - Dubai, Emirates (Ref. BD2EFN)","Gandhi Djuna - 28 Oct 2026 (booked 25 Oct 2026)",3700],
  ["VIA LAURENCE - Flight: Dubai - Medina, Emirates (Ref. QDAY3N)","Gandhi Djuna - 29 Oct 2026 (booked 25 Oct 2026)",2000],
  ["VIA LAURENCE - Upgrade to First Class + change of date: Dubai - Medina, Emirates, moved to 30 Oct 2026 (Ref. QDAY3N)","Gandhi Djuna - 30 Oct 2026",700],
  ["VIA LAURENCE - Flight: Frankfurt - Dubai, Emirates Business Class (Ref. NZDVXW)","Emanuel Ahr - 31 Oct 2026 (booked 27 Oct 2026)",2300],
  ["VIA LAURENCE - Flight: Geneva - Dubai, Emirates Business Class (Ref. CS65A6)","Silvia Garcia Vilar - 31 Oct 2026 (booked 28 Oct 2026)",2906.54],
  ["VIA LAURENCE - Flight: Dubai - Medina, Emirates Business Class (Ref. BLM3EC)","Silvia Garcia Vilar - Booked 28 Oct 2026",1193.46],
  ["VIA LAURENCE - Flight: Paris - Dubai, Emirates Business Class (Ref. IVDXNW)","Angelique Colanga Batuzola - 30 Oct 2026 (booked 29 Oct 2026)",2300],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates Business Class (Ref. 57GKEC)","Angelique Colanga Batuzola - 14 Nov 2026 (booked 29 Oct 2026)",2300],
  ["VIA LAURENCE - Flight: Medina - Dubai, Emirates, 2 passengers (Ref. CIAQHF)","Djuna Gandhi, Silvia Garcia Vilar - 04 Nov 2026 (booked 29 Oct 2026)",4000],
  ["VIA LAURENCE - Change of flight date: Geneva - Dubai moved to 31 Oct 2026 (Ref. CS65A6)","Silvia Garcia Vilar - Booked 30 Oct 2026",850],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates First Class (Ref. BGR7L6)","Marie-Josee Dante Adja-Damba - 15 Nov 2026 (booked 03 Nov 2026)",3700],
  ["VIA LAURENCE - Flight: Paris - Dubai, Emirates First Class (Ref. QWQCRF)","Marie-Josee Dante Adja-Damba - 23 Nov 2026 (booked 03 Nov 2026)",3700],
  ["VIA LAURENCE - Flight: Paris - Dubai, Emirates (05 Nov 2026) - Business x2 + First (Ref. BRW5BK, EC7PN6)","Junior Djuna, Jason Traore, Idriss Djuna - Booked 04 Nov 2026",8300],
  ["VIA LAURENCE - Extra luggage: Paris - Dubai (05 Nov 2026) - EUR 1,230 (Ref. BRW5BK, EC7PN6)","Idriss Djuna - Booked 04 Nov 2026",1377.6],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates Business (Ref. BMKUMS)","Junior Djuna, Jason Traore - 10 Nov 2026 (booked 04 Nov 2026)",4600],
  ["VIA LAURENCE - Flight: Dubai - Frankfurt, Emirates First Class (Ref. DZKE5S)","Emanuel Ahr, Ana Crnac - 07 Nov 2026 (booked 04 Nov 2026)",8000],
  ["VIA LAURENCE - Flight: Geneva - Dubai - Geneva, Emirates, 3 passengers (Ref. Q5QPAF / K8CKLW / IBM656)","Tania Raquel, Mikaela & Melany Moreira Cardoso Barbosa - 05 - 10 Nov 2026 (booked 04 Nov 2026)",18000],
  ["VIA LAURENCE - Change of flight date: Geneva / Dubai moved to 19 Nov 2026, 3 passengers (Ref. Q5QPAF / K8CKLW / IBM656)","Tania Raquel, Mikaela & Melany Moreira Cardoso Barbosa - Booked 09 Nov 2026",1200],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates (19 Nov 2026) - new ticket (Ref. BJYE7X)","Angelique Colanga Batuzola - Booked 10 Nov 2026",2300],
  ["VIA SYLVIA - Flight: Amsterdam - Dubai, Emirates Business Class, 2 passengers (Ref. 5OZASO)","Barae El Harrazi, Zizi Hofwijks - 15 Nov 2026 (booked 14 Nov 2026)",4600],
  ["VIA LAURENCE - Flight: Paris - Dubai, Emirates Business Class (Ref. BBNRIF)","Nguend Bebga - 16 Nov 2026",2300],
  ["VIA LAURENCE - Flight: Dubai - Paris, Emirates Business Class (Ref. JMHRU6)","Nguend Bebga - 23 Nov 2026",2300],
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
