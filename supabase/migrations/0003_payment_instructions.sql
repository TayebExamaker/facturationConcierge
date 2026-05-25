-- Add per-invoice editable payment instructions.
-- Falls back to PAYMENT_BLOCK constant when null (handled in app code).
alter table public.invoices
  add column if not exists payment_instructions text;
