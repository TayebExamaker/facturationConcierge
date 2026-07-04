// Server-side PDF text extraction + heuristic field parsing.
// Uses pdfjs-dist legacy build for Node compatibility.

import { pathToFileURL } from "node:url";

import { isKnownCurrency } from "@/lib/currencies";
import { parseMoneyInput } from "@/lib/format";

// Resolve pdfjs's legacy worker file as a file:// URL (mandatory on Windows,
// harmless on Linux/Vercel), memoized on first use.
//
// The require MUST be a *real* Node require, obtained at runtime via
// process.getBuiltinModule. A `createRequire` imported statically from
// "node:module" gets its `.resolve` rewritten by Next's webpack plugin into the
// bundler's own resolver — which only knows bundled modules and throws
// "Cannot find module 'pdfjs-dist/legacy/build/pdf.worker.mjs'" at runtime even
// though the file physically ships in node_modules (pdfjs-dist is externalized
// via next.config.mjs serverComponentsExternalPackages). Fetching the builtin
// at runtime keeps webpack from ever seeing the createRequire binding.
let workerSrcCache: string | null = null;
function resolvePdfWorkerSrc(): string {
  if (workerSrcCache) return workerSrcCache;
  const nodeModule = process.getBuiltinModule(
    "node:module",
  ) as typeof import("node:module");
  const nodeRequire = nodeModule.createRequire(import.meta.url);
  const spec = ["pdfjs-dist", "legacy", "build", "pdf.worker.mjs"].join("/");
  workerSrcCache = pathToFileURL(nodeRequire.resolve(spec)).href;
  return workerSrcCache;
}

export interface ParsedItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface ParsedPdf {
  invoiceNumber?: number;
  clientName?: string;
  clientAddress?: string;
  date?: string; // ISO YYYY-MM-DD when possible
  total?: number;
  currency?: string;
  items?: ParsedItem[];
  rawText: string;
  warnings: string[];
}

// Labels we stop on when collecting the To: block multi-line — anything past
// these means we've left the recipient section.
const STOP_LABELS = [
  /^(from|email|tel|phone|fax|work|date|ref|trip|invoice|po|terms|currency|attn|attention|subject)\s*[:#]/i,
];

// A line that is entirely a date — used to stop collecting the recipient block
// before the invoice date (which some layouts stack right under the address).
const RECIPIENT_STOP_DATE_RE =
  /^(?:[A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}|20\d{2}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})$/;

const SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "₽": "RUB",
  "₺": "TRY",
  "₪": "ILS",
  "₦": "NGN",
  "₫": "VND",
  "฿": "THB",
  "₱": "PHP",
  "د.إ": "AED",
};

/**
 * Parse a PDF file (Buffer/File) and extract best-effort invoice fields.
 * Never throws on extraction failure — returns warnings instead.
 */
export async function parseInvoicePdf(file: File | Buffer): Promise<ParsedPdf> {
  const warnings: string[] = [];
  let rawText = "";

  try {
    rawText = await extractText(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      rawText: "",
      warnings: [`Failed to extract text from PDF: ${msg}`],
    };
  }

  if (!rawText.trim()) {
    warnings.push("PDF contained no extractable text (likely scanned image)");
  }

  const invoiceNumber = extractInvoiceNumber(rawText, warnings);
  const { clientName, clientAddress } = extractRecipient(rawText, warnings);
  const date = extractDate(rawText, warnings);
  const currency = extractCurrency(rawText, warnings);
  const total = extractTotal(rawText, warnings);
  const items = extractLineItems(rawText, warnings);

  return {
    invoiceNumber,
    clientName,
    clientAddress,
    date,
    total,
    currency,
    items,
    rawText,
    warnings,
  };
}

async function extractText(file: File | Buffer): Promise<string> {
  const data = await toUint8Array(file);

  // Lazy import for Node-friendly entrypoint.
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs v4 dropped the `disableWorker` getDocument option and *requires* a
  // valid GlobalWorkerOptions.workerSrc, even in Node where it runs the worker
  // on the main thread ("fake worker"). Setting it to "" — or leaving it unset —
  // throws: Setting up fake worker failed: No "GlobalWorkerOptions.workerSrc"
  // specified. Point it at the legacy worker file resolved above.
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = resolvePdfWorkerSrc();
  }

  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct line-ish layout: join items with spaces but break on large Y jumps.
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += (line && !line.endsWith(" ") ? " " : "") + item.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pageTexts.push(lines.join("\n"));
  }

  try {
    await doc.destroy();
  } catch {
    // ignore
  }

  return pageTexts.join("\n\n");
}

async function toUint8Array(file: File | Buffer): Promise<Uint8Array> {
  if (typeof Buffer !== "undefined" && file instanceof Buffer) {
    return new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  }
  // Web File / Blob
  const ab = await (file as File).arrayBuffer();
  return new Uint8Array(ab);
}

function extractInvoiceNumber(text: string, warnings: string[]): number | undefined {
  // Look near "invoice" / "facture" keywords first.
  const near = text.match(
    /(?:invoice|facture)[^\n]{0,40}?#?\s*(\d{3,6})/i
  );
  if (near) return parseInt(near[1], 10);

  // Standalone label patterns like "Invoice No.: 2734" or "#2734"
  const standalone = text.match(/#\s*(\d{3,6})/);
  if (standalone) return parseInt(standalone[1], 10);

  warnings.push("Could not detect invoice number");
  return undefined;
}

/**
 * Pull the recipient block: name + any subsequent company/address lines that
 * follow before we hit another labeled field. Handles both:
 *
 *   To: Moheen Ahmed                        (inline form)
 *
 * and the multi-line layout common in charter quotes / bookings:
 *
 *   To:    Nathan Allan Sanahuja 4964307
 *          CONCIERGE ONE GROUP LTD
 *          12 Rue de la Paix, Paris
 *   Email: nathan@one-concierge.com
 */
function extractRecipient(
  text: string,
  warnings: string[],
): { clientName?: string; clientAddress?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/g, ""));

  // Anchor: a line containing the "To" label (alone, or label + value inline).
  let toIdx = -1;
  let inlineValue: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(?:bill(?:ed)?\s+)?to\s*:?\s*(.*)$/i);
    if (m && /(?:bill(?:ed)?\s+)?to\s*:/i.test(lines[i])) {
      toIdx = i;
      inlineValue = m[1].trim() || undefined;
      break;
    }
  }
  if (toIdx === -1) {
    warnings.push("Could not detect recipient block");
    return {};
  }

  // Collect inline value (if any) + up to 5 subsequent non-empty lines until we
  // hit another known label (Email:, From:, etc.) or an obvious break.
  const collected: string[] = [];
  if (inlineValue) collected.push(inlineValue);
  for (let j = toIdx + 1; j < lines.length && collected.length < 6; j++) {
    let ln = lines[j].trim();
    if (!ln) {
      if (collected.length) break;
      continue;
    }
    if (STOP_LABELS.some((re) => re.test(ln))) break;
    // A standalone date line is the invoice date bleeding in below the address
    // (common when the layout stacks it right after the recipient block).
    if (RECIPIENT_STOP_DATE_RE.test(ln)) break;
    // "Address :" is a sub-label inside the recipient block, not a stop label —
    // drop the label itself but keep any inline value and the lines beneath it.
    const addr = ln.match(/^address\s*:?\s*(.*)$/i);
    if (addr) {
      ln = addr[1].trim();
      if (!ln) continue;
    }
    collected.push(ln);
  }

  if (!collected.length) {
    warnings.push("Could not detect client name");
    return {};
  }

  // First line is the name. Strip a trailing numeric employee/customer id
  // ("Nathan Allan Sanahuja 4964307" -> "Nathan Allan Sanahuja").
  const rawName = collected[0];
  const clientName = rawName.replace(/\s+\d{3,}\s*$/, "").trim();

  const rest = collected.slice(1).filter(Boolean);
  const clientAddress = rest.length ? rest.join("\n") : undefined;

  return { clientName, clientAddress };
}

function extractDate(text: string, warnings: string[]): string | undefined {
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    jun: "06", jul: "07", aug: "08", sep: "09", sept: "09",
    oct: "10", nov: "11", dec: "12",
  };

  // Textual-month dates first: "May 2, 2026" / "22 May 2026" are almost always
  // the invoice header date, whereas numeric dates (ISO / DD-MM-YYYY) tend to
  // litter the line-item rows (trip dates), so a numeric-first scan would grab a
  // line-item date over the real invoice date.
  // 1. Month DD, YYYY
  const mdy = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (mdy) {
    const m = months[mdy[1].toLowerCase()];
    if (m) {
      return `${mdy[3]}-${m}-${mdy[2].padStart(2, "0")}`;
    }
  }

  // 2. DD Month YYYY ("22 May 2026")
  const dmyText = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/);
  if (dmyText) {
    const m = months[dmyText[2].toLowerCase()];
    if (m) {
      return `${dmyText[3]}-${m}-${dmyText[1].padStart(2, "0")}`;
    }
  }

  // 3. ISO YYYY-MM-DD
  const iso = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // 4. DD/MM/YYYY or DD-MM-YYYY
  const dmy = text.match(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](20\d{2})\b/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }

  warnings.push("Could not detect invoice date");
  return undefined;
}

function currencyTokenToCode(tok: string): string | undefined {
  const t = tok.trim();
  if (/^(?:\$US|US\$)$/.test(t)) return "USD";
  if (t === "CA$") return "CAD";
  if (t === "$") return "USD"; // ambiguous, but the app emits USD as "$US"
  if (SYMBOL_TO_CODE[t]) return SYMBOL_TO_CODE[t];
  const up = t.toUpperCase();
  return isKnownCurrency(up) ? up : undefined;
}

function extractCurrency(text: string, warnings: string[]): string | undefined {
  // 1. A currency token glued to a money amount ("117 619,00 $US") is the
  //    invoice's real currency. Prefer it over a bare ISO code that may appear
  //    in prose — e.g. payment instructions like "Enter amount in AED (1 USD =
  //    …)" would otherwise hijack a USD invoice to AED.
  const adjacent = text.match(new RegExp(`${ITEM_MONEY}\\s*(${ITEM_CURRENCY})`));
  if (adjacent) {
    const code = currencyTokenToCode(adjacent[1]);
    if (code) return code;
  }

  // 2. Explicit ISO code (case-insensitive) — match common ones first.
  const codeMatch = text.match(
    /\b(USD|EUR|GBP|JPY|CHF|CAD|AUD|CNY|HKD|SGD|NZD|KRW|INR|BRL|MXN|RUB|TRY|ZAR|SEK|NOK|DKK|PLN|CZK|HUF|RON|ILS|ISK|AED|SAR|QAR|KWD|BHD|OMR|THB|IDR|MYR|PHP|VND|LAK|KHR|MMK|BND|ARS|CLP|COP|PEN|UYU|EGP|MAD|NGN|KES|GHS|BTC|USDT|USDC)\b/
  );
  if (codeMatch && isKnownCurrency(codeMatch[1])) return codeMatch[1].toUpperCase();

  // 3. Symbol
  for (const sym of Object.keys(SYMBOL_TO_CODE)) {
    if (text.includes(sym)) return SYMBOL_TO_CODE[sym];
  }

  warnings.push("Could not detect currency");
  return undefined;
}

// ---------- line-item table parsing ----------
//
// Handles the Concierge One invoice layout (the same shape the app emits, plus
// the invoice-generator.com family it descends from):
//
//   Object                Quantity  Price          Amount
//   Adja Damba & Silvia   1         3 000,00 $US   3 000,00 $US
//   Geneva Miami                    <- detail lines belong to the row above
//   29/01/2026
//   Julian Zimmer         1         0,00 $US       0,00 $US
//   ...
//   117 619,00 $US                  <- standalone totals: end of the table
//   Sub-Total:
//
// A row's "main" line ends with two money+currency tokens (unit price + amount);
// every non-matching line beneath it is a continuation of that row's description
// (route / airline / date). French money formatting ("3 000,00") is expected —
// `\s` matches the U+00A0 / U+202F thousands separators PDF exporters emit.

// Money like "3 000,00" / "117 619,00" / "0,00" — decimals are REQUIRED so a
// bare quantity integer can never be mistaken for a money value. The thousands
// separator is `\s+` (not `\s`): PDF text extraction renders the narrow/no-break
// space as *two* ordinary spaces ("3  000,00"), so a single `\s` would only ever
// match amounts under 1000.
const ITEM_MONEY = "\\d{1,3}(?:\\s+\\d{3})*,\\d{2}";
// Currency token trailing an amount. Covers this tool's "$US" plus the common
// symbols/codes sibling exports use.
const ITEM_CURRENCY =
  "(?:\\$US|US\\$|CA\\$|\\$|€|£|¥|₹|₩|₽|CHF|AED|USD|EUR|GBP|AUD|CAD)";

const ITEM_ROW_RE = new RegExp(
  `^(.+?)\\s+(\\d+)\\s+(${ITEM_MONEY})\\s*${ITEM_CURRENCY}\\s+(${ITEM_MONEY})\\s*${ITEM_CURRENCY}\\s*$`,
);
const STANDALONE_TOTAL_RE = new RegExp(`^\\s*${ITEM_MONEY}\\s*${ITEM_CURRENCY}\\s*$`);
const TABLE_HEADER_RE =
  /object\s+quantity\s+price\s+amount|description\s+(?:qty|quantity)\s+(?:unit\s*price|price)\s+amount/i;
const TOTALS_LABEL_RE = /^(?:sub-?\s?total|tax\b|total\b|payment\b)/i;

/**
 * Extract the invoice's line items from the items table. Returns [] when the
 * table header can't be located (unknown layout) so callers keep their existing
 * single-line fallback rather than emitting garbage rows.
 */
function extractLineItems(text: string, warnings: string[]): ParsedItem[] {
  const lines = text.split(/\r?\n/);

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TABLE_HEADER_RE.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return [];

  const items: ParsedItem[] = [];
  for (let i = start; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) continue;
    // End of the table: the totals block (standalone amounts, then labels).
    if (STANDALONE_TOTAL_RE.test(ln) || TOTALS_LABEL_RE.test(ln)) break;

    const m = ITEM_ROW_RE.exec(ln);
    if (m) {
      items.push({
        description: m[1].trim(),
        quantity: parseInt(m[2], 10) || 1,
        unit_price: parseMoneyInput(m[3]),
        amount: parseMoneyInput(m[4]),
      });
    } else if (items.length) {
      // Detail line (route / airline / date) — fold into the current row.
      const prev = items[items.length - 1];
      prev.description = `${prev.description}\n${ln}`;
    }
    // Lines before the first matched row are table noise — ignore.
  }

  if (!items.length) {
    warnings.push("Line-item table detected but no rows could be parsed.");
  }
  return items;
}

function extractTotal(text: string, warnings: string[]): number | undefined {
  // Find "total" keyword and look at numbers on the same/adjacent lines.
  const lines = text.split(/\r?\n/);
  const candidates: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/total/i.test(lines[i])) {
      const slice = [lines[i], lines[i + 1] ?? "", lines[i + 2] ?? ""].join(" ");
      const nums = slice.match(/(?<![\d,])\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,8})?(?![\d,])/g);
      if (nums) {
        for (const n of nums) {
          const cleaned = n.replace(/[,\s]/g, "");
          const v = parseFloat(cleaned);
          if (!Number.isNaN(v)) candidates.push(v);
        }
      }
    }
  }
  if (candidates.length) {
    // Largest near "total" is usually the grand total.
    return Math.max(...candidates);
  }

  warnings.push("Could not detect total amount");
  return undefined;
}
