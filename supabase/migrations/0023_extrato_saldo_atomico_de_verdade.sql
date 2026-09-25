-- A função `inserir_movimento_extrato` da migração 0021/0022 usava `pg_advisory_xact_lock` pra
-- travar concorrência — testado agora com 10 lançamentos disparados de propósito ao mesmo tempo
-- pro mesmo contrato, e a trava NÃO impediu leituras duplicadas do saldo anterior (o mesmo bug
-- que essa função deveria ter corrigido). Só percebido no teste — nenhum lançamento de verdade
-- passou por essa função ainda (ela nunca foi usada em produção até agora).
--
-- Troca pra a mesma técnica já comprovada nesta sessão pro valor pago das parcelas: um contador
-- por contrato, incrementado com UPDATE ... SET saldo = saldo + valor (atômico de verdade — o
-- Postgres trava a LINHA durante a operação, sem depender de lock manual nenhum). Testado com
-- 10 incrementos em paralelo: somou exatamente certo, sem perder nem duplicar nenhum.
--
-- A tabela nova (`contratos_saldo`) é populada a partir do saldo mais recente já registrado no
-- extrato de cada contrato — quem já tem histórico continua exatamente de onde parou.
--
-- 100% aditivo: cria uma tabela nova (populada a partir de dado existente, nada é apagado) e
-- substitui a função (CREATE OR REPLACE).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create table public.contratos_saldo (
  contrato_id uuid primary key references public.contratos (id) on delete cascade,
  saldo numeric not null default 0
);

alter table public.contratos_saldo enable row level security;

insert into public.contratos_saldo (contrato_id, saldo)
select distinct on (contrato_id) contrato_id, saldo
from public.movimentos_extrato
order by contrato_id, data desc, id desc;

create or replace function public.inserir_movimento_extrato(
  p_contrato_id uuid,
  p_descricao text,
  p_data timestamptz,
  p_tipo text,
  p_valor numeric
) returns table (id uuid, saldo numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_novo_saldo numeric;
  v_id uuid;
begin
  insert into public.contratos_saldo (contrato_id, saldo)
  values (p_contrato_id, p_valor)
  on conflict (contrato_id) do update
    set saldo = contratos_saldo.saldo + p_valor
  returning contratos_saldo.saldo into v_novo_saldo;

  insert into public.movimentos_extrato (contrato_id, descricao, data, tipo, valor, saldo)
  values (p_contrato_id, p_descricao, p_data, p_tipo, p_valor, v_novo_saldo)
  returning movimentos_extrato.id into v_id;

  return query select v_id, v_novo_saldo;
end;
$$;
