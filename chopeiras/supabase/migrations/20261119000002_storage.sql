-- Bucket de fotos (chopeiras, serviços e assinaturas)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- Qualquer usuário ativo lê; gestor e técnico enviam fotos
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.meu_perfil() is not null);
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.eh_gestor_ou_tecnico());
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.eh_gestor_ou_tecnico());
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.eh_gestor());
