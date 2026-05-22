export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

// Curated list: G20 + GCC + ASEAN + major Latin American/African currencies + crypto placeholders.
// Decimals follow ISO 4217 minor units (JPY/KRW = 0). Crypto entries use 8 decimals.
export const CURRENCIES: Currency[] = [
  // G7
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2 },

  // G20 / major
  { code: "CNY", name: "Chinese Yuan Renminbi", symbol: "¥", decimals: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", decimals: 2 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", decimals: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimals: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", decimals: 2 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", decimals: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", decimals: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", decimals: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", decimals: 2 },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", decimals: 2 },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", decimals: 0 },

  // GCC
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimals: 2 },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", decimals: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", decimals: 3 },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", decimals: 3 },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", decimals: 3 },

  // ASEAN
  { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimals: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimals: 2 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0 },
  { code: "LAK", name: "Lao Kip", symbol: "₭", decimals: 2 },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", decimals: 2 },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", decimals: 2 },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", decimals: 2 },

  // Latin America / other
  { code: "ARS", name: "Argentine Peso", symbol: "AR$", decimals: 2 },
  { code: "CLP", name: "Chilean Peso", symbol: "CL$", decimals: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "CO$", decimals: 2 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/.", decimals: 2 },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", decimals: 2 },

  // Africa
  { code: "EGP", name: "Egyptian Pound", symbol: "£", decimals: 2 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", decimals: 2 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 2 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", decimals: 2 },

  // Crypto placeholders
  { code: "BTC", name: "Bitcoin", symbol: "₿", decimals: 8 },
  { code: "USDT", name: "Tether", symbol: "USDT", decimals: 8 },
  { code: "USDC", name: "USD Coin", symbol: "USDC", decimals: 8 },
];

export function findCurrency(code: string): Currency | undefined {
  const norm = code.trim().toUpperCase();
  return CURRENCIES.find((c) => c.code === norm);
}

export function isKnownCurrency(code: string): boolean {
  return !!findCurrency(code);
}
