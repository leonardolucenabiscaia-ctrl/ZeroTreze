-- Data em que o acordo passa a valer de fato, independente de quando foi cadastrado no sistema
-- (`criado_em`) e independente do vencimento da 1ª parcela do cronograma — às vezes o acordo
-- demora pra entrar em vigor.
--
-- 100% aditivo: só adiciona uma coluna nova, sem apagar ou alterar nada existente.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.acordos
  add column data_inicio date;
