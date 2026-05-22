-- Concierge One Invoicing — initial schema
create extension if not exists "uuid-ossp";

do $$ begin
  create type invoice_status as enum ('draft','sent','paid','overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_source as enum ('created','imported');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number integer not null unique,
  label text not null,
  client_name text not null,
  client_address text,
  date date not null,
  payment_terms text,
  po_number text,
  currency text not null default 'USD',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  shipping numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  to_be_paid numeric(14,2) not null default 0,
  notes text,
  status invoice_status not null default 'draft',
  source invoice_source not null default 'created',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_date_idx on public.invoices(date desc);
create index if not exists invoices_client_idx on public.invoices(client_name);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end; $$ language plpgsql;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- MVP: no auth required, but RLS-ready
alter table public.invoices enable row level security;
drop policy if exists "anon all" on public.invoices;
create policy "anon all" on public.invoices for all to anon using (true) with check (true);
drop policy if exists "auth all" on public.invoices;
create policy "auth all" on public.invoices for all to authenticated using (true) with check (true);

-- storage bucket for imported / generated PDFs
insert into storage.buckets (id, name, public) values ('invoice-pdfs', 'invoice-pdfs', true) on conflict (id) do nothing;
