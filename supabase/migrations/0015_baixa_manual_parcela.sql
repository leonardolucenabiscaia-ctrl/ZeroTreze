-- "Dar baixa manual" num pagamento — pra quando o cliente pagou em dinheiro ou por outro meio
-- fora do fluxo digital de comprovante, e o administrador registra isso diretamente na parcela
-- (visualizar parcela > dar baixa), sem passar pelo fluxo normal de envio/confirmação de
-- comprovante.
--
-- 100% aditivo: só adiciona colunas novas e amplia a lista de valores permitidos em
-- forma_pagamento (pix/boleto continuam funcionando exatamente como hoje, sem mudança de
-- comportamento). Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas
  add column baixa_manual_valor numeric,
  add column baixa_manual_por_nome text,
  add column baixa_manual_em timestamptz,
  add column baixa_manual_motivo text;

-- Descobre o nome de verdade da constraint de forma_pagamento (gerado automaticamente pelo
-- Postgres, pode não ser previsível) em vez de arriscar um DROP CONSTRAINT com nome errado —
-- mesma técnica já usada na migração 0013 pro campo status.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'public.parcelas'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%forma_pagamento%';

  if nome_constraint is not null then
    execute format('alter table public.parcelas drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.parcelas
  add constraint parcelas_forma_pagamento_check
    check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro'));
