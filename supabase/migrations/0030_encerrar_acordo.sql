-- Acrescenta "encerrado" às situações possíveis de um acordo — mesma ideia do "encerrado" de
-- contrato: encerramento manual, feito pelo administrador, distinto de "quitado" (que já acontece
-- sozinho quando o saldo do acordo chega a zero) e de "rompido" (uso já existente, anterior a
-- esta migração).
--
-- Postgres não permite ALTER num check constraint existente — precisa apagar e recriar. 100%
-- aditivo do ponto de vista de dado: só amplia os valores aceitos, nenhuma linha é alterada.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.acordos
  drop constraint acordos_situacao_check;

alter table public.acordos
  add constraint acordos_situacao_check
    check (situacao in ('ativo', 'quitado', 'rompido', 'encerrado'));
