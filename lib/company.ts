// Tags every invoice this app creates so the shared Supabase project can host
// both Concierge One and Full Access Travel invoices in the same `invoices`
// table while each frontend only sees its own. Numbering stays globally
// sequential across both.
export const COMPANY_KEY = "concierge-one" as const;

export const COMPANY = {
  name: "CONCIERGE ONE GROUP LTD",
  addressLines: [
    "182-184 High Street North",
    "London, E6 2JA",
    "United Kingdom",
  ],
  short: "COG",
} as const;

/**
 * Built-in payment details. This is the *fallback / factory reset* value only:
 * the live block is stored in `public.app_settings` and edited from /settings
 * (see `app/actions/settings.ts`). Invoices whose `payment_instructions` is
 * null inherit the stored block at read time, so editing it in the app updates
 * every invoice at once. Keep this constant in sync-ish, but the DB wins.
 */
export const PAYMENT_BLOCK = `USD Payment:

Global Account Name: One Concierge LLC
Bank Account Number: 439513543316178
ACH Routing Number: 121145307
Address: 1209 Menaul BLVD NE St A, Albuquerque, NM 87107, USA
Bank Name: Slash


EUR SWIFT Payment (For accounts outside of Europe):

Account Name: CONCIERGE ONE GROUP LTD
Account Number: 88538746180
Bank Code: 7171
Agency Code: 072
SWIFT Code: DBSSSGSG
Country: Singapour
Bank Name: DBS Bank Ltd
Bank Address: 12 Marina Boulevard, DBS Asia Central, Marina Bay Financial Centre Tower 3, Singapore, Singapour, 018982


EUR SEPA Payment:

Global Account Name: CONCIERGE ONE GROUP LTD
IBAN: DE18202208000047274348
SWIFT Code: SXPYDEHH
Bank Name: Banking Circle S.A.
Location: Allemagne
Bank Address: MAXIMILIANSTR 54
City: Muenchen
Postal Code: D-80538


GBP Payment:

Global Account Name: CONCIERGE ONE GROUP LTD
Bank Account Number: 05112702
Sort Code: 041907
SWIFT Code: AIRWGB22XXX
Bank Name: AIRWALLEX (UK) LIMITED
Location: Labs House 15-19 Bloomsbury Way, London, WC1A 2TH, UK


AED Payment:

Account Name: CONCIERGE ONE GROUP LTD
IBAN: AE630446498900000104171
SWIFT Code: SCBLAEAD
Bank Name: Standard Chartered Bank – Dubai Branch
Location: Standard Chartered Tower, Downtown Dubai, Dubai, UAE


Best regards`;
