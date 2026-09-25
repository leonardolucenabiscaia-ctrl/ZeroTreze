-- Corrige um bug pré-existente (não introduzido pela migração 0019, só herdado por ela): as
-- funções `incrementar_valor_pago_parcela` e `incrementar_valor_pago_parcela_acordo` decidiam
-- "quitada?" comparando o total pago contra o valor ORIGINAL da parcela, sem descontar nenhum
-- desconto administrativo aplicado. Resultado: uma parcela com desconto podia ser paga
-- exatamente no valor pedido pelo próprio sistema e MESMO ASSIM nunca virar "paga" — ficando
-- "vencida" pra sempre e, pior, travando qualquer novo pagamento nela (o valor pedido zera, mas
-- o sistema exige valor > 0 pra aceitar um novo envio).
--
-- A causa raiz é que "quanto falta pagar" (considerando desconto, multa, juros e correção) é uma
-- conta que só existe em TypeScript (`calcularValorAtualizado`/`calcularSaldoAcordo`) — reproduzir
-- essa fórmula em SQL duplicaria a lógica financeira em dois lugares que podem sair de sincronia.
--
-- Solução: essas funções agora fazem SÓ o incremento atômico (o que de fato precisa ser atômico,
-- pra não perder nem dobrar um pagamento) e devolvem o novo valor pago — quem decide "ficou
-- quitada?" volta a ser o código TypeScript, usando a mesma fórmula única já usada em todo o
-- resto do sistema pra calcular quanto falta.
--
-- 100% aditivo: só substitui a definição de duas funções já existentes (CREATE OR REPLACE).
-- Nenhuma tabela, coluna ou dado é alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create or replace function public.incrementar_valor_pago_parcela(
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

create or replace function public.incrementar_valor_pago_parcela_acordo(
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
