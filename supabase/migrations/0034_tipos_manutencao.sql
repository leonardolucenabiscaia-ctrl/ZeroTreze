-- Catálogo de tipos de manutenção (ex.: "Pastilha de freio", "Óleo e filtros") — crescente:
-- qualquer um da equipe pode criar um tipo novo na hora de colocar um veículo em manutenção,
-- e ele fica disponível pra seleção nas próximas vezes.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create table public.tipos_manutencao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_por_nome text,
  criado_em timestamptz not null default now()
);
alter table public.tipos_manutencao enable row level security;

-- Itens específicos escolhidos na manutenção em andamento — guarda o NOME (não uma FK), igual ao
-- histórico abaixo, já que o catálogo pode crescer/mudar depois e isso não deve alterar o que já
-- foi selecionado numa manutenção em curso.
alter table public.veiculos add column manutencao_itens text[];
