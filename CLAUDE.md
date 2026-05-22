# Concierge One Invoicing — Project Context for Claude Code

PWA de facturation pour **CONCIERGE ONE GROUP LTD** (concierge de luxe).
Stack 100 % installable (Windows / Mac / iOS via Safari).

## Stack

- **Next.js 14** (App Router) + TypeScript strict
- **Supabase** (Postgres + Storage) — schéma dans `supabase/migrations/`
- **Tailwind CSS** + **shadcn/ui** (style new-york)
- **Poppins** via `next/font/google` (font-sans + font-serif)
- **@ducanh2912/next-pwa** (Workbox) — service worker auto-généré
- **@react-pdf/renderer** pour la génération PDF côté client (lazy-loaded au clic, pas en SSR)
- **pdfjs-dist** pour le parsing PDF côté serveur (server actions)
- **papaparse** pour l'export CSV
- **react-hook-form** + **zod** pour les formulaires

## Design system

Light theme, sobre, accents noirs (inspiration invoice-generator.com).

- **Background** : blanc (`#FFFFFF`)
- **Foreground / Accent** : slate-900 (`#0F172A`)
- **Bordures** : slate-200 (`#E2E8F0`)
- **Muted text** : slate-500 (`#64748B`)
- **Typo** : Poppins partout (sans + serif aliasés)
- **Card** : classe utilitaire `.luxury-card` (fond blanc, bordure slate-200, ombre douce)
- **Variant bouton noir** : `<Button variant="gold">` (héritage du token, rendu en `bg-foreground text-background`)
- **Bandeaux noirs** : header de tableau ligne items utilise `bg-navy-900 text-white`

## Conventions & ownership

| Domaine | Dossiers / fichiers |
|---|---|
| **FRONT** (UI) | `app/(routes)/`, `components/ui/`, `components/dashboard/`, `components/invoice/`, `components/import/`, `components/layout/`, `components/brand/` |
| **BACK** (DB + actions + PDF/CSV) | `supabase/migrations/`, `lib/supabase/`, `app/actions/`, `lib/pdf/`, `lib/csv/`, `lib/currencies.ts` |
| **INFRA** (PWA) | `public/manifest.json`, `public/icons/`, `scripts/generate-icons.mjs`, `components/pwa/`, `app/offline/`, `app/template.tsx`, `app/install-prompt-mount.tsx` |
| **QA** (validation, errors, helpers) | `lib/validation/`, `lib/format.ts`, `lib/dedupe.ts`, `lib/errors.ts`, `lib/responsive.ts`, `hooks/`, `components/error-boundary.tsx`, `components/import/manual-entry-fallback.tsx` |
| **Shared (locked)** | `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `next.config.mjs`, `package.json`, `tsconfig.json`, `lib/utils.ts`, `lib/company.ts` |

## Contrats d'API clés

- `app/actions/invoices.ts` exporte : `listInvoices`, `getInvoice`, `createInvoice`, `updateInvoice`, `deleteInvoice`, `setInvoiceStatus`, `getNextInvoiceNumber`, `checkInvoiceNumberExists`, `importInvoiceFromPdf`, `parseInvoicePdfOnly`, `exportInvoicesCsv`.
- `lib/pdf/generate.tsx` exporte : `InvoicePdfDocument`, `renderInvoicePdfBlob(invoice)`, `invoicePdfFilename(invoice)`. **Toujours importer en lazy** depuis un client component (`await import("@/lib/pdf/generate")` à l'intérieur d'un handler) — l'import statique casse le SSR.
- `lib/format.ts` : `formatMoney(amount, currency)`, `formatDate(date)`, `formatInvoiceLabel(num, name)`, `pascalCaseName`, `parseMoneyInput`.
- Filtres invoice (côté server) : `{ status?, currency?, clientName?, dateFrom?, dateTo? }`. **Ne pas confondre avec** `client / from / to` (état local de la FilterBar).
- Champ date sur l'invoice : **`date`** (pas `issue_date`). Adresse client : **`client_address`** (pas `delivery_address`).
- `PAYMENT_BLOCK` (constante `lib/company.ts`) est **automatiquement injecté** dans `InvoicePreview` ET dans le PDF généré — ne jamais l'inliner.

## Pièges connus

- **`new Date()` au scope module** dans un client component → hydration mismatch sous HMR (server et client évaluent à des moments différents). Toujours déférer à un `useEffect` post-mount.
- **`@react-pdf/renderer` importé statiquement** depuis un `'use client'` → casse le SSR avec "Element type is invalid". Lazy load uniquement.
- **`<html suppressHydrationWarning>`** est intentionnel : protège contre les extensions navigateur (Dark Reader, Grammarly…) qui injectent des attributs avant l'hydratation.
- **Status enum** = `draft | sent | paid | overdue` uniquement. Pas de `void`.
- Le bouton `variant="gold"` est nommé pour des raisons historiques mais rend en **noir** (héritage du token `gold` repurposé).

## Commandes utiles

```powershell
npm run dev          # dev server (auto-fallback de port si 3000 occupé)
npm run build        # build prod + génération du service worker
npm run start        # lance le build prod
npm run typecheck    # tsc --noEmit
npm run lint
node scripts/generate-icons.mjs   # régénère les icônes PNG/SVG à partir du master
```

## Variables d'environnement

`.env.local` (jamais commité) :

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co   # base URL, PAS /rest/v1/
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Skills disponibles

Trois skills sont installés et utilisables pendant les sessions sur ce projet :

### `ui-ux-pro-max` (installé localement)

UI/UX design intelligence : 50+ styles, 161 palettes, 57 pairings typographiques, 99 règles UX, etc.
**Quand l'invoquer** : refonte visuelle, choix de palette/typo, audit a11y/responsive, restructuration de composants.
**Localisation** : `C:\Users\trunk\.claude\skills\ui-ux-pro-max\SKILL.md`

### `frontend-design` (plugin)

Création d'interfaces frontend distinctives, production-grade, évitant l'esthétique générique "AI".
**Quand l'invoquer** : nouvelle page, composant signature, hero/landing custom, polish design.

### `code-reviewer` (development/code-reviewer)

Revue de code (best practices, sécurité, perf, lisibilité).
**Quand l'invoquer** : après un gros refactor, avant un commit important, audit d'un fichier.
Installé via `npx claude-code-templates@latest --skill development/code-reviewer`.
**Localisation** : `./.claude/skills/code-reviewer/` (skill projet, contrairement à `ui-ux-pro-max` qui est global).

## Comment travailler avec Claude Code sur ce projet

- Pour un changement visuel non-trivial → demander d'invoquer `ui-ux-pro-max` ou `frontend-design`.
- Pour une revue → invoquer `code-reviewer`.
- Pour les pages : `app/page.tsx` redirige sur `/dashboard`. Le formulaire vit à `/invoices/new`, l'édition à `/invoices/[id]?edit=1`, l'import à `/invoices/import`.
- Le mode dev Next.js désactive le PWA (`disable: process.env.NODE_ENV === "development"` dans `next.config.mjs`) — pour tester l'installation PWA il faut `npm run build && npm run start`.
- Quand un agent BACK et FRONT travaillent en parallèle, **les contrats d'API ci-dessus sont la source de vérité**. Si un agent dévie, c'est l'agent FRONT qui s'aligne sur les noms du schéma.
