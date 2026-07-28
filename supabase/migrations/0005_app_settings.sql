-- App-level settings, one row per company (shared Supabase project hosts both
-- Concierge One and Full Access Travel — see 0004_add_company_column.sql).
--
-- `payment_instructions` here is the *global* payment block shown on every
-- invoice. Invoices keep their own nullable `payment_instructions` column
-- (0003) which now acts purely as a per-invoice override: when it is null the
-- app resolves the value from this table at read time, so editing the block in
-- /settings retro-actively updates every invoice, PDF and preview.

create table if not exists public.app_settings (
  company text primary key,
  payment_instructions text,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Same open policy as public.invoices (app-level auth lives in middleware.ts).
alter table public.app_settings enable row level security;
drop policy if exists "anon all" on public.app_settings;
create policy "anon all" on public.app_settings for all to anon using (true) with check (true);
drop policy if exists "auth all" on public.app_settings;
create policy "auth all" on public.app_settings for all to authenticated using (true) with check (true);
