-- Mesmo sistema de pagamento parcial que já existe nas parcelas de contrato e nas parcelas de
-- acordo, agora também nas multas — o locatário pode enviar o pagamento (inteiro ou aos poucos),
-- cada envio conferido separadamente pelo administrador antes de valer.
--
-- 100% aditivo: só adiciona colunas e uma tabela nova. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.multas
  add column valor_pago numeric not null default 0;

create table public.pagamentos_parciais_multa (
  id uuid primary key default gen_random_uuid(),
  multa_id uuid not null references public.multas (id) on delete cascade,
  valor numeric not null check (valor > 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'dinheiro', 'outro')),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'confirmado', 'recusado')),
  enviado_em timestamptz not null default now(),
  confirmado_em timestamptz
);

alter table public.pagamentos_parciais_multa enable row level security;

alter table public.documentos
  add column pagamento_parcial_multa_id uuid references public.pagamentos_parciais_multa (id) on delete cascade;

-- Mesmo padrão de `incrementar_valor_pago_parcela_acordo` (migração 0025) — incremento atômico
-- pra dois cliques em "confirmar" não conseguirem creditar o mesmo pagamento duas vezes.
create function public.incrementar_valor_pago_multa(
  p_multa_id uuid,
  p_incremento numeric
) returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor_pago numeric;
begin
  update public.multas
    set valor_pago = multas.valor_pago + p_incremento
    where id = p_multa_id
    returning multas.valor_pago into v_valor_pago;

  if not found then
    raise exception 'Multa não encontrada';
  end if;

  return v_valor_pago;
end;
$$;
