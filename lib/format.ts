import { format as formatDateFn } from "date-fns";
import { getCurrencyDecimals, isCryptoCurrency } from "@/lib/validation/currency";

/**
 * Formatting helpers shared by FRONT (display) and BACK (PDF/CSV).
 *
 * Date formatting goes through `date-fns` exclusively — `toLocaleDateString`
 * is unreliable on Windows where ICU data may be absent.
 */

const VALID_ISO_RE = /^[A-Z]{3}$/;

export function formatMoney(amount: number, currency: string): string {
  const safeAmount = isFinite(amount) ? amount : 0;
  const code = (currency || "USD").toUpperCase();
  const decimals = getCurrencyDecimals(code);

  // Crypto and non-ISO codes can't use Intl currency formatter — fall back.
  if (isCryptoCurrency(code) || !VALID_ISO_RE.test(code)) {
    return `${safeAmount.toFixed(decimals)} ${code}`;
  }

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(decimals)} ${code}`;
  }
}

export function formatDate(
  date: string | Date,
  fmt: "short" | "long" = "short"
): string {
  const d = typeof date === "string" ? parseDateString(date) : date;
  if (!d || isNaN(d.getTime())) return "";
  const pattern = fmt === "long" ? "EEEE, dd MMMM yyyy" : "dd MMM yyyy";
  return formatDateFn(d, pattern);
}

/**
 * Parse a YYYY-MM-DD or ISO string defensively. Returns null on garbage.
 */
function parseDateString(s: string): Date | null {
  if (!s) return null;
  // YYYY-MM-DD — construct in local time to avoid TZ shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Strip diacritics, drop non-alphanumerics, capitalize each whitespace-separated
 * word, and join. "Moheen Ahmed" -> "MoheenAhmed", "José Núñez" -> "JoseNunez".
 */
export function pascalCaseName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";
  // Strip combining marks (U+0300..U+036F) added by NFD normalization.
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");

  return normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * "#2734-MoheenAhmed" style label used in invoice lists and the PDF filename.
 * Tolerant of missing or stringified inputs so it can be called from row-level
 * code where the client name isn't always at hand.
 */
export function formatInvoiceLabel(
  invoiceNumber: number | string | null | undefined,
  clientName?: string | null
): string {
  const n = typeof invoiceNumber === "string" ? Number(invoiceNumber) : invoiceNumber;
  const numPart = typeof n === "number" && Number.isFinite(n) ? String(n) : "—";
  const pascal = pascalCaseName(clientName);
  return pascal ? `#${numPart}-${pascal}` : `#${numPart}`;
}

/**
 * Parse a user-entered money string. Tolerant of:
 *   - currency symbols ($, £, €, ¥)
 *   - thousands separators ("1,234.56" or "1.234,56")
 *   - leading/trailing whitespace
 *   - negative signs
 * Returns 0 for unparseable input.
 */
export function parseMoneyInput(input: string): number {
  if (typeof input !== "string") return Number(input) || 0;
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Strip currency symbols and letters (keep digits, dots, commas, minus).
  let cleaned = trimmed.replace(/[^\d.,\-]/g, "");
  if (!cleaned) return 0;

  // Detect which is the decimal separator by looking at the LAST separator.
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot === -1 && lastComma === -1) {
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }

  let decimalSep: "." | "," | null = null;
  if (lastDot > lastComma) decimalSep = ".";
  else if (lastComma > lastDot) decimalSep = ",";

  if (decimalSep === ".") {
    // Dot is decimal — strip commas (thousands).
    cleaned = cleaned.replace(/,/g, "");
  } else if (decimalSep === ",") {
    // Comma is decimal — strip dots (thousands), then swap comma -> dot.
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}
