-- Corrige um erro na própria migração 0021: dentro de `inserir_movimento_extrato`, a cláusula
-- `returns table (id uuid, saldo numeric)` cria automaticamente uma variável de saída chamada
-- "id" — e o `order by ... id desc` (sem qualificar de qual tabela) ficou ambíguo entre essa
-- variável e a coluna `movimentos_extrato.id`. Só percebido agora, testando a função — nenhuma
-- chamada de verdade rodou entre a 0021 e esta correção (a aplicação ainda não usa essa função,
-- essa parte do código só vai pro ar depois desta correção).
--
-- 100% aditivo: só substitui a definição de uma função já existente (CREATE OR REPLACE).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

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
  v_saldo_anterior numeric;
  v_novo_saldo numeric;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_contrato_id::text));

  select movimentos_extrato.saldo into v_saldo_anterior
    from public.movimentos_extrato
    where contrato_id = p_contrato_id
    order by movimentos_extrato.data desc, movimentos_extrato.id desc
    limit 1;

  v_novo_saldo := coalesce(v_saldo_anterior, 0) + p_valor;

  insert into public.movimentos_extrato (contrato_id, descricao, data, tipo, valor, saldo)
  values (p_contrato_id, p_descricao, p_data, p_tipo, p_valor, v_novo_saldo)
  returning movimentos_extrato.id into v_id;

  return query select v_id, v_novo_saldo;
end;
$$;
