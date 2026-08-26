-- "Financeiro Acordos": dá às parcelas de acordo o mesmo ciclo de vida de pagamento das parcelas
-- de contrato (em_aberto -> aguardando_confirmacao -> pago, ou vencido no meio do caminho), e
-- acrescenta ao acordo o valor cheio da dívida original e a periodicidade das parcelas.
--
-- Seguro rodar mesmo com dados existentes: não há nenhum acordo real cadastrado ainda (confirmado
-- antes de escrever esta migração).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.acordos
  add column valor_divida_original numeric,
  add column periodicidade text not null default 'mensal' check (periodicidade in ('semanal', 'mensal'));

alter table public.parcelas_acordo
  add column status text not null default 'em_aberto'
    check (status in ('pago', 'em_aberto', 'vencido', 'aguardando_confirmacao')),
  add column forma_pagamento text check (forma_pagamento in ('pix', 'boleto')),
  add column data_envio_comprovante timestamptz,
  add column data_pagamento timestamptz;

update public.parcelas_acordo set status = 'pago' where pago = true;

-- A coluna "pago" fica parada aqui, sem uso (não é mais lida nem escrita pelo código) — só não é
-- apagada por pedido explícito, pra essa migração ser 100% aditiva (nada de DROP).

-- Comprovante de pagamento por parcela de acordo — mesmo padrão da coluna parcela_id já usada
-- pelas parcelas de contrato.
alter table public.documentos
  add column parcela_acordo_id uuid references public.parcelas_acordo (id) on delete set null;
