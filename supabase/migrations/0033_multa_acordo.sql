-- Multa por atraso nas parcelas de acordo (hoje só existe pra parcela de contrato normal) —
-- mesmo esquema de `percentual_multa`, configurável separadamente em Configurações.
-- Default 0 (sem multa) até o administrador configurar de propósito — ninguém é cobrado
-- retroativamente só por essa coluna existir.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parametros_financeiros
  add column percentual_multa_acordo numeric not null default 0;
