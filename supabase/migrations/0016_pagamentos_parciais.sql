-- Pagamento parcial de parcela — o locatário pode ir pagando aos poucos durante a semana (ex:
-- R$200 na segunda, R$200 na quarta, R$350 na sexta), cada envio confirmado separadamente pelo
-- administrador. `parcelas.valor_pago` acumula os valores já CONFIRMADOS; `pagamentos_parciais`
-- é a fila de envios (aguardando_confirmacao / confirmado / recusado).
--
-- 100% aditivo: só adiciona colunas e uma tabela nova. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas
  add column valor_pago numeric not null default 0;

create table public.pagamentos_parciais (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references public.parcelas (id) on delete cascade,
  valor numeric not null check (valor > 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro')),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'confirmado', 'recusado')),
  enviado_em timestamptz not null default now(),
  confirmado_em timestamptz
);

alter table public.pagamentos_parciais enable row level security;

alter table public.documentos
  add column pagamento_parcial_id uuid references public.pagamentos_parciais (id) on delete cascade;
