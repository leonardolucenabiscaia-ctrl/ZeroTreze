-- Motivo/descrição do desconto aplicado numa parcela — visível tanto para a equipe quanto para o
-- cliente que recebeu o desconto (antes só existiam os valores numéricos, sem explicação).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas
  add column desconto_motivo text;
