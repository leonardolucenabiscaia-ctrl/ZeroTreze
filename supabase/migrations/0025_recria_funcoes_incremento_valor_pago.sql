-- A migração 0020 tentava trocar o retorno de `incrementar_valor_pago_parcela` e
-- `incrementar_valor_pago_parcela_acordo` de "uma linha com colunas" pra "um número só", usando
-- CREATE OR REPLACE FUNCTION — mas o Postgres não permite trocar o TIPO de retorno de uma função
-- já existente dessa forma (dá erro "cannot change return type of existing function"; exige
-- apagar a função antes de recriar). Só percebido agora, testando de verdade: a função continuava
-- devolvendo o formato antigo, então "ficou quitada?" continuava sendo decidido do jeito errado
-- (ignorando desconto).
--
-- Esta migração apaga as duas funções e recria do jeito que a 0020 pretendia — dessa vez de um
-- jeito que o Postgres aceita.
--
-- 100% aditivo do ponto de vista de dado: não apaga nem altera nenhuma tabela ou linha, só
-- redefine duas funções (apagando e recriando, porque é a única forma de trocar o tipo de
-- retorno).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

drop function if exists public.incrementar_valor_pago_parcela(uuid, numeric);
drop function if exists public.incrementar_valor_pago_parcela_acordo(uuid, numeric);

create function public.incrementar_valor_pago_parcela(
  p_parcela_id uuid,
  p_incremento numeric
) returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor_pago numeric;
begin
  update public.parcelas
    set valor_pago = parcelas.valor_pago + p_incremento
    where id = p_parcela_id
    returning parcelas.valor_pago into v_valor_pago;

  if not found then
    raise exception 'Parcela não encontrada';
  end if;

  return v_valor_pago;
end;
$$;

create function public.incrementar_valor_pago_parcela_acordo(
  p_parcela_acordo_id uuid,
  p_incremento numeric
) returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor_pago numeric;
begin
  update public.parcelas_acordo
    set valor_pago = parcelas_acordo.valor_pago + p_incremento
    where id = p_parcela_acordo_id
    returning parcelas_acordo.valor_pago into v_valor_pago;

  if not found then
    raise exception 'Parcela do acordo não encontrada';
  end if;

  return v_valor_pago;
end;
$$;
