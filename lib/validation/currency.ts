/**
 * Currency validation helpers.
 * Crypto codes are accepted alongside ISO 4217 fiat codes.
 */

const CRYPTO_CODES: ReadonlySet<string> = new Set([
  "BTC",
  "USDT",
  "USDC",
  "SOL",
  "ETH",
]);

/**
 * Zero-decimal ISO 4217 currencies (subset — extend as needed).
 */
const ZERO_DECIMAL_FIAT: ReadonlySet<string> = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "ISK",
  "HUF",
  "TWD",
]);

export function isCryptoCurrency(code: string): boolean {
  if (!code) return false;
  return CRYPTO_CODES.has(code.toUpperCase());
}

export function getCurrencyDecimals(code: string): number {
  if (!code) return 2;
  const upper = code.toUpperCase();
  if (CRYPTO_CODES.has(upper)) return 8;
  if (ZERO_DECIMAL_FIAT.has(upper)) return 0;
  return 2;
}
