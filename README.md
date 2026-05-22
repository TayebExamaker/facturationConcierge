# Concierge One Invoicing

Luxury invoice manager PWA for **CONCIERGE ONE GROUP LTD**.

## Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres + Storage)
- Tailwind CSS + shadcn/ui (new-york style)
- @ducanh2912/next-pwa + Workbox (offline + installable)
- @react-pdf/renderer (PDF generation)
- pdfjs-dist (PDF import parsing)
- papaparse (CSV export)

## Quick start

```powershell
npm install
# 1) Paste your Supabase URL + anon key into .env.local
# 2) Run the schema migration once in the Supabase SQL editor:
#    supabase/migrations/0001_init.sql
npm run dev
```

Open http://localhost:3000.

## Install as a desktop / mobile app

- **Windows / Mac (Chrome, Edge):** click the install icon in the address bar.
- **iOS (Safari):** Share → Add to Home Screen.

## Project layout

```
app/                 routes (App Router)
components/          UI primitives + composed components
  ui/                shadcn/ui primitives
lib/                 utils, supabase client, pdf/csv helpers, validation
supabase/migrations/ schema
public/icons/        PWA icons (192, 512, apple-touch)
public/manifest.json PWA manifest
```
