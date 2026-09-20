-- Mesmo sistema de pagamento parcial que já existe nas parcelas de contrato, agora também nas
-- parcelas de acordo — o locatário pode ir completando aos poucos ao longo da semana, cada envio
-- confirmado separadamente pelo administrador.
--
-- 100% aditivo: só adiciona colunas e uma tabela nova. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas_acordo
  add column valor_pago numeric not null default 0;

create table public.pagamentos_parciais_acordo (
  id uuid primary key default gen_random_uuid(),
  parcela_acordo_id uuid not null references public.parcelas_acordo (id) on delete cascade,
  valor numeric not null check (valor > 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro')),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'confirmado', 'recusado')),
  enviado_em timestamptz not null default now(),
  confirmado_em timestamptz
);

alter table public.pagamentos_parciais_acordo enable row level security;

alter table public.documentos
  add column pagamento_parcial_acordo_id uuid references public.pagamentos_parciais_acordo (id) on delete cascade;
