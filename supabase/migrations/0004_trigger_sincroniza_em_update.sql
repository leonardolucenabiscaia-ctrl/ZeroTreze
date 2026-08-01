-- Correção de verdade (comprovada por teste): a API administrativa do Supabase Auth não grava
-- `app_metadata` no INSERT inicial de `auth.users` — ela é mesclada numa atualização logo em
-- seguida. Um trigger só de `AFTER INSERT` nunca via o `perfil` correto, sempre caindo no
-- fallback 'cliente'. Agora o trigger também dispara em UPDATE (só quando os metadados
-- realmente mudam, não a cada login) e faz upsert para corrigir a linha.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, telefone, cpf_cnpj, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf_cnpj', ''),
    coalesce(new.raw_app_meta_data ->> 'perfil', 'cliente')
  )
  on conflict (id) do update set
    nome = coalesce(new.raw_user_meta_data ->> 'nome', public.usuarios.nome),
    email = new.email,
    telefone = coalesce(new.raw_user_meta_data ->> 'telefone', public.usuarios.telefone),
    cpf_cnpj = coalesce(new.raw_user_meta_data ->> 'cpf_cnpj', public.usuarios.cpf_cnpj),
    perfil = coalesce(new.raw_app_meta_data ->> 'perfil', public.usuarios.perfil);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dispara de novo só quando os metadados realmente mudam (não a cada login, que já atualiza
-- `last_sign_in_at` em toda linha).
create trigger on_auth_user_metadata_updated
  after update on auth.users
  for each row
  when (
    old.raw_app_meta_data is distinct from new.raw_app_meta_data
    or old.raw_user_meta_data is distinct from new.raw_user_meta_data
  )
  execute function public.handle_new_user();
