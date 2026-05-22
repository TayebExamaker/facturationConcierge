-- Permissive storage policies for invoice-pdfs bucket (MVP, no auth).

drop policy if exists "invoice-pdfs anon select" on storage.objects;
create policy "invoice-pdfs anon select" on storage.objects
  for select to anon using (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs anon insert" on storage.objects;
create policy "invoice-pdfs anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs anon update" on storage.objects;
create policy "invoice-pdfs anon update" on storage.objects
  for update to anon using (bucket_id = 'invoice-pdfs') with check (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs anon delete" on storage.objects;
create policy "invoice-pdfs anon delete" on storage.objects
  for delete to anon using (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs auth select" on storage.objects;
create policy "invoice-pdfs auth select" on storage.objects
  for select to authenticated using (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs auth insert" on storage.objects;
create policy "invoice-pdfs auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs auth update" on storage.objects;
create policy "invoice-pdfs auth update" on storage.objects
  for update to authenticated using (bucket_id = 'invoice-pdfs') with check (bucket_id = 'invoice-pdfs');

drop policy if exists "invoice-pdfs auth delete" on storage.objects;
create policy "invoice-pdfs auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'invoice-pdfs');
