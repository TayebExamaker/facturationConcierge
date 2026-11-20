# API CRM — Concierge One Invoicing (v1, lecture seule)

Base URL : `https://<ton-domaine>/api/v1`
Auth : header `Authorization: Bearer <CRM_API_KEY>` (ou `X-API-Key: <CRM_API_KEY>`).
La clé se définit dans la variable d'env `CRM_API_KEY` (≥ 24 caractères ; plusieurs clés séparées par des virgules pour faire une rotation).

Toutes les réponses sont en JSON. Les montants ne sont **jamais additionnés entre devises**. Les credit notes comptent en négatif.
"Impayé" = tout document dont le statut n'est pas `paid` et dont le solde (`amount_due`) n'est pas à 0, net de ce qui a déjà été encaissé (`amount_paid`).

| Endpoint | Contenu |
|---|---|
| `GET /api/v1` | Liste des endpoints (pas besoin de clé) |
| `GET /api/v1/summary` | Totaux par devise : facturé, payé, impayé, en retard + compteurs |
| `GET /api/v1/unpaid` | Toutes les factures impayées, plus anciennes d'abord, avec totaux par devise |
| `GET /api/v1/invoices` | Liste paginée, filtrable |
| `GET /api/v1/invoices/{numéro ou uuid}` | Une facture (ex. `/invoices/3398`) |
| `GET /api/v1/clients?q=...` | Annuaire clients + totaux par devise |
| `GET /api/v1/clients/{nom}` | Un client + toutes ses factures (ex. `/clients/onyx%20carriage`) |

Filtres de `/invoices` : `status` (`draft,sent,paid,overdue`, séparés par virgule), `unpaid=true`, `currency=EUR`, `client=<texte>`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `type=invoice|credit_note`, `limit` (1–500, défaut 100), `offset`.

Champs utiles d'une facture : `number`, `label`, `status`, `client.name`, `date`, `days_since_issue`, `currency`, `items[]` (description / quantity / unit_price / amount), `total`, `amount_paid`, `amount_due`, `pdf_url`. Les coordonnées bancaires ne sont pas exposées.

Exemple :

```bash
curl -H "Authorization: Bearer $CRM_API_KEY" "https://<ton-domaine>/api/v1/invoices?client=schwartz&unpaid=true"
```

Erreurs : `{ "error": { "code": "...", "message": "..." } }` — 401 clé invalide, 400 paramètre invalide, 404 introuvable, 503 API non configurée.

---

# Serveur MCP (Claude)

Permet à Claude (claude.ai, app desktop/mobile, Claude Code) de lire les factures et d'enregistrer les paiements.

- **claude.ai / app Claude** : Réglages → Connecteurs → *Ajouter un connecteur personnalisé* → URL :
  `https://facturation-concierge.vercel.app/api/mcp/<CRM_API_KEY>`
  (la clé est dans l'URL car ce formulaire n'accepte pas de header — ne partage jamais cette URL).
- **Claude Code** :
  `claude mcp add --transport http concierge https://facturation-concierge.vercel.app/api/mcp --header "Authorization: Bearer <CRM_API_KEY>"`

Outils exposés :

| Outil | Rôle |
|---|---|
| `get_summary` | Totaux par devise (facturé / payé / impayé) |
| `list_unpaid` | Impayés, filtrables par client, devise, ancienneté |
| `search_invoices` | Recherche (client, statut, dates, texte dans les lignes…) |
| `get_invoice` | Une facture complète |
| `list_clients` / `get_client` | Annuaire clients et fiche client |
| `find_invoices_for_payment` | Rapprochement : à partir d'un virement (montant, devise, payeur), propose les factures correspondantes, y compris les combinaisons de 2–3 factures |
| `record_payment` ✏️ | Enregistre un paiement : solde complet → statut `paid` ; partiel → déduit ("Amount paid") |
| `record_payments` ✏️ | Même chose par lot (100 max) — pour un rapprochement complet |
| `set_invoice_status` ✏️ | Change le statut |

Les outils ✏️ écrivent dans la base. Pas de création, d'édition de lignes ni de suppression via MCP.
