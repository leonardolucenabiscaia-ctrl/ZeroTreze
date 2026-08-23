-- Estado de manutenção do veículo (mecânica ou funilaria) — separado do "bloqueado" existente,
-- usado pela nova tela "Manutenção" e pelo "Dashboard de TV" da frota.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.veiculos
  add column manutencao_tipo text check (manutencao_tipo in ('mecanica', 'funilaria')),
  add column manutencao_desde timestamptz;
