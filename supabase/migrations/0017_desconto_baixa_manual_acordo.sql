-- Dá às parcelas de acordo a mesma capacidade que as parcelas de contrato já têm: desconto
-- administrativo e baixa manual de pagamento (dinheiro ou outro meio fora do fluxo de
-- comprovante). Antes disso, o botão "Ações" da aba Financeiro Acordos só mostrava algo
-- ("Revisar") pra quem já tinha enviado comprovante — pra qualquer outra parcela, ficava vazio.
--
-- 100% aditivo: só adiciona colunas e amplia a lista de valores permitidos em forma_pagamento
-- (pix/boleto continuam funcionando exatamente como hoje). Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas_acordo
  add column desconto_percentual numeric check (desconto_percentual between 0 and 100),
  add column desconto_valor_fixo numeric check (desconto_valor_fixo >= 0),
  add column desconto_aplicado_por_nome text,
  add column desconto_aplicado_em timestamptz,
  add column desconto_motivo text,
  add column baixa_manual_valor numeric,
  add column baixa_manual_por_nome text,
  add column baixa_manual_em timestamptz,
  add column baixa_manual_motivo text;

-- Descobre o nome de verdade da constraint de forma_pagamento (gerado automaticamente pelo
-- Postgres, pode não ser previsível) em vez de arriscar um DROP CONSTRAINT com nome errado —
-- mesma técnica já usada nas migrações 0013 e 0015.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'public.parcelas_acordo'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%forma_pagamento%';

  if nome_constraint is not null then
    execute format('alter table public.parcelas_acordo drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.parcelas_acordo
  add constraint parcelas_acordo_forma_pagamento_check
    check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro'));
