-- Observação livre do administrador na criação do contrato — aparece também no PDF gerado, numa
-- seção própria.
--
-- 100% aditivo: só adiciona uma coluna nova, sem apagar ou alterar nada existente.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.contratos
  add column observacao text;
