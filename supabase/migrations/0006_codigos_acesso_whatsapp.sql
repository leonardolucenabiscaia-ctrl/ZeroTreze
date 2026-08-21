-- Substitui o OTP nativo do Supabase (só manda por e-mail) por um código próprio de 6 dígitos,
-- enviado via WhatsApp Business API — usado no primeiro acesso do cliente (e no reenvio de
-- convite pelo admin). O código fica guardado com hash (nunca em texto puro) e expira em 15
-- minutos.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create table public.codigos_acesso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  codigo_hash text not null,
  expira_em timestamptz not null,
  usado boolean not null default false,
  criado_em timestamptz not null default now()
);

create index codigos_acesso_usuario_id_idx on public.codigos_acesso (usuario_id);

alter table public.codigos_acesso enable row level security;
