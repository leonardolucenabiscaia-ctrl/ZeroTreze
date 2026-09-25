-- Dá às multas a mesma capacidade que parcelas de contrato e de acordo já têm: desconto
-- administrativo e baixa manual de pagamento (dinheiro ou outro meio fora do fluxo de
-- comprovante) — usado pela nova área "Financeiro Multas" no admin.
--
-- 100% aditivo: só adiciona colunas novas. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.multas
  add column forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro')),
  add column desconto_percentual numeric check (desconto_percentual between 0 and 100),
  add column desconto_valor_fixo numeric check (desconto_valor_fixo >= 0),
  add column desconto_aplicado_por_nome text,
  add column desconto_aplicado_em timestamptz,
  add column desconto_motivo text,
  add column baixa_manual_valor numeric,
  add column baixa_manual_por_nome text,
  add column baixa_manual_em timestamptz,
  add column baixa_manual_motivo text;
