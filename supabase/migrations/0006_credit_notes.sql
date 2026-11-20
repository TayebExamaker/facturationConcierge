-- Credit notes live in public.invoices alongside invoices so they share the
-- single, globally unique invoice_number sequence (the accountant gets one
-- continuous numbering across invoices AND credit notes, both apps included).
--
--   document_type          'invoice' (default, every existing row) | 'credit_note'
--   credited_invoice_id    the invoice this credit note cancels / refunds
--   credited_invoice_number denormalised copy of its number, so the PDF keeps
--                          printing "Original invoice #NNNN" even if the
--                          original row is later deleted.
--
-- Amounts on a credit note are stored POSITIVE (the PDF reads "TOTAL
-- CREDITED"); aggregates subtract them. For a credit note, status 'paid'
-- means the money has been refunded to the client.

alter table public.invoices
  add column if not exists document_type text not null default 'invoice';

do $$ begin
  alter table public.invoices
    add constraint invoices_document_type_check
    check (document_type in ('invoice', 'credit_note'));
exception when duplicate_object then null; end $$;

alter table public.invoices
  add column if not exists credited_invoice_id uuid
    references public.invoices(id) on delete set null;

alter table public.invoices
  add column if not exists credited_invoice_number integer;

create index if not exists invoices_document_type_idx on public.invoices(document_type);
create index if not exists invoices_credited_invoice_idx on public.invoices(credited_invoice_id);
