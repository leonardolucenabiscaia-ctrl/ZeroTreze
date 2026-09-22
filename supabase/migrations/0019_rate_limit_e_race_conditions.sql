-- Duas proteções pedidas pelo dono do sistema:
--
-- 1) RATE LIMIT: uma tabela + função genérica pra limitar quantas vezes uma ação pode ser feita
--    num intervalo de tempo (ex.: tentativas de código de acesso, pra impedir que alguém tente
--    "adivinhar" o código de 6 dígitos de outra pessoa). O contador fica no banco (não em memória
--    do servidor) porque a Vercel roda cada requisição numa instância possivelmente diferente —
--    um contador em memória não protegeria nada de verdade.
--
-- 2) RACE CONDITIONS: dois ajustes pra fechar brechas onde duas ações "ao mesmo tempo" podiam
--    corromper dado:
--    a) Um mesmo carro podia ficar vinculado a dois contratos ativos se dois cliques de "criar
--       contrato" acontecessem quase juntos — a checagem "já existe contrato ativo?" e a criação
--       do novo contrato eram dois passos separados, sem nada impedindo os dois de passar pela
--       checagem antes de qualquer um terminar. Agora o próprio banco impede isso (índice único).
--    b) Confirmar um pagamento parcial fazia "lê o valor pago, soma, salva de volta" em dois
--       passos — se dois pagamentos da mesma parcela fossem confirmados ao mesmo tempo (ou o
--       mesmo botão clicado duas vezes rápido), um dos dois valores podia se perder ou ser
--       contado em dobro. As novas funções fazem a soma direto no banco, numa operação só,
--       atômica — impossível dois incrementos se atropelarem.
--
-- 100% aditivo: só cria tabela, funções e um índice novos. Nenhum dado é apagado ou alterado.
-- Confirmado antes de escrever esta migração: hoje NENHUM carro tem mais de um contrato ativo
-- simultâneo, então o índice novo (passo 2a) não vai falhar ao ser criado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

-- ---------------------------------------------------------------------------------------------
-- 1) Rate limit
-- ---------------------------------------------------------------------------------------------

create table public.rate_limits (
  chave text primary key,
  contagem integer not null default 1,
  expira_em timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Incrementa o contador de "chave" — se a janela de tempo anterior já expirou, reinicia em 1 com
-- uma janela nova; senão, só soma. Tudo numa única instrução (INSERT ... ON CONFLICT), então dois
-- pedidos concorrentes pra mesma chave nunca conseguem "pisar" um no incremento do outro (o
-- Postgres trava a linha durante a operação). Devolve a contagem atual, pra quem chamou comparar
-- contra o limite.
create or replace function public.verificar_rate_limit(
  p_chave text,
  p_janela_segundos integer
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_contagem integer;
begin
  insert into public.rate_limits (chave, contagem, expira_em)
  values (p_chave, 1, now() + (p_janela_segundos || ' seconds')::interval)
  on conflict (chave) do update
    set contagem = case
        when rate_limits.expira_em < now() then 1
        else rate_limits.contagem + 1
      end,
      expira_em = case
        when rate_limits.expira_em < now() then now() + (p_janela_segundos || ' seconds')::interval
        else rate_limits.expira_em
      end
  returning contagem into v_contagem;

  return v_contagem;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2a) Um veículo só pode ter um contrato ativo por vez — reforçado no próprio banco
-- ---------------------------------------------------------------------------------------------

create unique index contratos_veiculo_ativo_unico
  on public.contratos (veiculo_id)
  where status <> 'encerrado';

-- ---------------------------------------------------------------------------------------------
-- 2b) Incremento atômico de valor_pago (parcelas de contrato e de acordo)
-- ---------------------------------------------------------------------------------------------

create or replace function public.incrementar_valor_pago_parcela(
  p_parcela_id uuid,
  p_incremento numeric
) returns table (valor_pago numeric, valor_original numeric, quitada boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor_pago numeric;
  v_valor_original numeric;
  v_quitada boolean;
begin
  update public.parcelas
    set valor_pago = parcelas.valor_pago + p_incremento
    where id = p_parcela_id
    returning parcelas.valor_pago, parcelas.valor_original into v_valor_pago, v_valor_original;

  if not found then
    raise exception 'Parcela não encontrada';
  end if;

  v_quitada := v_valor_pago >= v_valor_original - 0.01;

  if v_quitada then
    update public.parcelas set status = 'pago', data_pagamento = now() where id = p_parcela_id;
  end if;

  return query select v_valor_pago, v_valor_original, v_quitada;
end;
$$;

create or replace function public.incrementar_valor_pago_parcela_acordo(
  p_parcela_acordo_id uuid,
  p_incremento numeric
) returns table (valor_pago numeric, valor numeric, quitada boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor_pago numeric;
  v_valor numeric;
  v_quitada boolean;
begin
  update public.parcelas_acordo
    set valor_pago = parcelas_acordo.valor_pago + p_incremento
    where id = p_parcela_acordo_id
    returning parcelas_acordo.valor_pago, parcelas_acordo.valor into v_valor_pago, v_valor;

  if not found then
    raise exception 'Parcela do acordo não encontrada';
  end if;

  v_quitada := v_valor_pago >= v_valor - 0.01;

  if v_quitada then
    update public.parcelas_acordo set status = 'pago', data_pagamento = now() where id = p_parcela_acordo_id;
  end if;

  return query select v_valor_pago, v_valor, v_quitada;
end;
$$;
