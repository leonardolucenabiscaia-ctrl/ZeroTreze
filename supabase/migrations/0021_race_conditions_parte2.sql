-- Duas race conditions encontradas na inspeção completa do sistema (mesma categoria das já
-- corrigidas na migração 0019):
--
-- 1) Liberar a parcela semanal seguinte era outro check-then-insert sem trava: se duas
--    requisições lessem "nenhuma parcela em_aberto" quase ao mesmo tempo (ex.: o cliente abrindo
--    o dashboard dele no exato momento em que o admin abre a tela do contrato), as duas podiam
--    criar uma parcela nova pro mesmo número/semana — duplicando a cobrança daquela semana.
--    Confirmado antes de escrever esta migração: hoje não existe nenhuma parcela duplicada
--    (mesmo contrato_id + numero) nas 1960 parcelas já cadastradas, então o índice novo não vai
--    falhar ao ser criado.
--
-- 2) O saldo do extrato (`movimentos_extrato.saldo`) era calculado lendo a última linha e
--    somando em código — se dois pagamentos do mesmo contrato fossem confirmados quase ao mesmo
--    tempo, os dois podiam ler o mesmo saldo anterior e um dos dois lançamentos "sumia" do saldo
--    acumulado (mesmo o lançamento em si ficando registrado, o saldo mostrado dali pra frente
--    ficaria errado). Agora existe uma função só pra inserir um movimento, que lê o saldo
--    anterior e insere a linha nova numa operação só, travada por contrato (nenhum outro
--    lançamento do MESMO contrato consegue calcular o saldo "ao mesmo tempo").
--
-- 100% aditivo: só cria um índice e uma função novos. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

create unique index parcelas_contrato_numero_unico
  on public.parcelas (contrato_id, numero);

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
  -- Trava só pra esse contrato — outro contrato lançando ao mesmo tempo não espera nada. Some
  -- automaticamente ao fim da transação desta chamada (não precisa "destravar" manualmente).
  perform pg_advisory_xact_lock(hashtext(p_contrato_id::text));

  select movimentos_extrato.saldo into v_saldo_anterior
    from public.movimentos_extrato
    where contrato_id = p_contrato_id
    order by data desc, id desc
    limit 1;

  v_novo_saldo := coalesce(v_saldo_anterior, 0) + p_valor;

  insert into public.movimentos_extrato (contrato_id, descricao, data, tipo, valor, saldo)
  values (p_contrato_id, p_descricao, p_data, p_tipo, p_valor, v_novo_saldo)
  returning movimentos_extrato.id into v_id;

  return query select v_id, v_novo_saldo;
end;
$$;
