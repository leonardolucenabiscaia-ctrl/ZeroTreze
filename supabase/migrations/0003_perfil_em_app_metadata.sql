-- Correção de segurança: o trigger lia `perfil` de `raw_user_meta_data` (user_metadata),
-- que é editável pelo PRÓPRIO usuário via `supabase.auth.updateUser()` — ou seja, um cliente
-- logado poderia se autopromover a administrador. `perfil` precisa vir de `raw_app_meta_data`
-- (app_metadata), que só a API administrativa (chave secreta) consegue definir/alterar.
--
-- Continuam vindo de user_metadata (não são um vetor de escalação de privilégio, e o app não
-- tem cadastro público de qualquer forma): nome, telefone, cpf_cnpj.
--
-- Como aplicar: cole no SQL Editor do painel do Supabase e rode.

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
  );
  return new;
end;
$$;
