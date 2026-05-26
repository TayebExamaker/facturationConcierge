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

export const PAYMENT_BLOCK = `Card paiement :

https://business.mamopay.com/pay/divinerental-67fb29
Enter amount in AED (1 USD = 3.673 AED) and proceed to your paiement, please add your first name and last name and booking reference if possible.
(There is 3% card fee additional on the amount)


USD Payment :

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
Date de création: 2026-03-03


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


Crypto Payment :

TRC20 USDT :
TQAYqds8YmTUdPPttDsjmFBoVis65wtHmh

ERC20 USDT/USDC :
0x4644485Eb8BF0EAB76D1F8FD695DC87f3168094c

BTC (btc chain) :
bc1qp660au6v4p9svsm04d6aercuck966allp6tley

SOL (Sol chain USDC) :
CpWdoqZZqCLyKjFguDUqpcLX8jVTEMe8Kx1ozAf787xr


Best regards`;
