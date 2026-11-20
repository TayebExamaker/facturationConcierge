/**
 * Aligne les factures par assistant de Gims sur le SOA (source : ITEMS de
 * scripts/create-invoice-3390.mjs, lignes préfixées "VIA <ASSISTANT> - ").
 *
 *   #2600 JULIAN / Gims · #3041 SYLVIA / Gims · #3058 RAF / Gims · #3060 LAURENCE / Gims
 *
 * Une facture dont les libellés et montants correspondent déjà ligne pour ligne au SOA
 * n'est pas touchée. Sinon : items, totaux et date sont remplacés.
 *
 *   node scripts/sync-gims-assistant-invoices.mjs          # applique
 *   node scripts/sync-gims-assistant-invoices.mjs --dry    # affiche, n'écrit rien
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const COMPANY_KEY = "concierge-one";
const SOA_DATE = "2026-11-14";
const TARGETS = { JULIAN: 2600, SYLVIA: 3041, RAF: 3058, LAURENCE: 3060 };

const cents = (n) => Math.round(n * 100);

// Les lignes ITEMS du script #3390 sont une ligne JSON chacune.
const soa = readFileSync(join(ROOT, "scripts", "create-invoice-3390.mjs"), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.startsWith('  ["VIA '))
  .map((l) => JSON.parse(l.trim().replace(/,$/, "")));

function itemsFor(assistant) {
  const prefix = `VIA ${assistant} - `;
  return soa
    .filter(([d]) => d.startsWith(prefix))
    .map(([d, when, amount]) => ({
      description: `${d.slice(prefix.length)}\n${when}`,
      quantity: 1,
      unit_price: amount,
      amount,
    }));
}

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

async function main() {
  const covered = Object.keys(TARGETS).reduce((n, a) => n + itemsFor(a).length, 0);
  if (covered !== soa.length) {
    throw new Error(`${soa.length - covered} ligne(s) du SOA sans assistant connu.`);
  }

  const { url, key } = loadEnv();
  if (!url || !key) throw new Error("Manque NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const base = `${url.replace(/\/+$/, "")}/rest/v1/invoices`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  for (const [assistant, number] of Object.entries(TARGETS)) {
    const items = itemsFor(assistant);
    const total = items.reduce((s, it) => s + cents(it.amount), 0) / 100;

    const res = await fetch(`${base}?select=*&invoice_number=eq.${number}`, { headers });
    if (!res.ok) throw new Error(`Lecture #${number} échouée (${res.status}): ${await res.text()}`);
    const [existing] = await res.json();
    if (!existing) throw new Error(`Facture #${number} introuvable.`);
    if (existing.company !== COMPANY_KEY || existing.client_name !== `${assistant} / Gims`) {
      throw new Error(`#${number} appartient à ${existing.client_name} — refus d'écraser.`);
    }
    // Un écart total ≠ to_be_paid signale un acompte saisi : on ne l'écrase pas.
    if (cents(existing.total) !== cents(existing.to_be_paid) || existing.discount || existing.tax_amount) {
      throw new Error(`#${number} porte un acompte / remise / taxe — à traiter à la main.`);
    }

    // Compare libellés + montants : un SOA révisé peut ne changer qu'une référence.
    const sig = (list) => JSON.stringify(list.map((it) => [it.description, cents(it.amount)]));
    const before = sig(existing.items);
    const after = sig(items);
    const head = `#${number} ${assistant} / Gims : ${existing.items.length} lignes ${existing.total} → ${items.length} lignes ${total.toFixed(2)}`;

    if (before === after) {
      console.log(`${head} — déjà conforme au SOA, inchangée`);
      continue;
    }
    if (DRY) {
      console.log(`${head} — (dry)`);
      continue;
    }
    const patch = await fetch(`${base}?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ items, subtotal: total, total, to_be_paid: total, date: SOA_DATE }),
    });
    if (!patch.ok) throw new Error(`Mise à jour #${number} échouée (${patch.status}): ${await patch.text()}`);
    console.log(`${head} — ✅ mise à jour`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
