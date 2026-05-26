-- Multi-tenant: tag each invoice with the originating company so two sibling
-- apps (Concierge One + Full Access Travel) can share a single Supabase
-- project. The invoice_number sequence remains globally unique across both,
-- which is the whole point — the accountant gets one continuous numbering.
--
-- Default is 'concierge-one' so existing rows are auto-tagged correctly when
-- this migration runs on the original Concierge One database. The Full Access
-- app will explicitly set 'full-access-travel' on insert.

alter table public.invoices
  add column if not exists company text not null default 'concierge-one';

create index if not exists invoices_company_idx on public.invoices(company);
