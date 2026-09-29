-- Data de vencimento da entrada do acordo — tratada como uma "parcela" própria (data
-- independente da data de início do acordo e da 1ª parcela do cronograma).
--
-- 100% aditivo: só adiciona uma coluna nova, sem apagar ou alterar nada existente.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.acordos
  add column data_entrada date;
