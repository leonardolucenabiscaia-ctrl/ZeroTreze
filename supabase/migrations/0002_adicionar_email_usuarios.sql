-- Correção: a tabela `usuarios` da migração 0001 esqueceu a coluna `email`
-- (o tipo `Usuario` do app tem `email: string`). Sem isso, resolver login por
-- CPF/CNPJ e exibir o e-mail do usuário exigiriam uma chamada extra à Admin
-- API do Auth a cada consulta — mais simples manter uma cópia aqui, mantida
-- em sincronia pelo trigger de criação de usuário.
--
-- Como aplicar: cole no SQL Editor do painel do Supabase e rode.

alter table public.usuarios add column email text;

-- Backfill (não deve haver linhas reais ainda, mas por segurança).
update public.usuarios u
set email = a.email
from auth.users a
where a.id = u.id and u.email is null;

alter table public.usuarios alter column email set not null;
alter table public.usuarios add constraint usuarios_email_key unique (email);

-- Recria o trigger de criação automática incluindo o e-mail.
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
    coalesce(new.raw_user_meta_data ->> 'perfil', 'cliente')
  );
  return new;
end;
$$;
