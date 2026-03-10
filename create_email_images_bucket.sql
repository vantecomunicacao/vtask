-- Criação do Bucket
insert into storage.buckets (id, name, public)
values ('email_images', 'email_images', true);

-- Políticas para permitir upload e deleção (ajuste conforme necessidade de segurança)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'email_images' );

create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'email_images' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete their own images"
  on storage.objects for delete
  using ( bucket_id = 'email_images' and auth.role() = 'authenticated' );
