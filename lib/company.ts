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

export const PAYMENT_BLOCK = `USD Payment :

Global Account Name: One Concierge LLC
Bank Account Number: 439513543316178
ACH Routing Number: 121145307


Paiement en EUR :

Informations sur le compte mondial d'Airwallex :
Nom du Compte Global: CONCIERGE ONE GROUP LTD
IBAN: DE18202208000047274348
Code SWIFT: SXPYDEHH
Nom de la banque: Banking Circle S.A.
Lieu: Allemagne
Adresse de la banque: MAXIMILIANSTR 54
Ville: Muenchen
Code postal: D-80538


Pound payment :

Global Account Name: CONCIERGE ONE GROUP LTD
Bank Account Number: 05112702
Sort Code: 041907
SWIFT Code: AIRWGB22XXX
Bank Name: AIRWALLEX (UK) LIMITED
Location: Labs House 15-19 Bloomsbury Way, London, WC1A 2TH, UK


Paiement in AED :

Account Name: CONCIERGE ONE GROUP LTD
IBAN: AE630446498900000104171
SWIFT Code: SCBLAEAD
Bank Name: Standard Chartered Bank – Dubai Branch
Location: Standard Chartered Tower, Downtown Dubai, Dubai, UAE


Best regards`;
