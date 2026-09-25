-- Acordos passam a ser enviados pra assinatura eletrônica na ClickSign automaticamente, do
-- mesmo jeito que já acontece com contratos. Guarda o mesmo conjunto de colunas já usado em
-- `contratos` — sem os campos legados da antiga integração AssinaDoc (assinatura_request_id/
-- assinatura_signing_key), que nem o próprio contrato usa mais de verdade.
--
-- 100% aditivo: só adiciona colunas novas. Nenhum dado é apagado ou alterado.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.acordos
  add column assinatura_document_key text,
  add column assinatura_envelope_id text,
  add column assinatura_status text,
  add column assinatura_enviado_em timestamptz,
  add column assinatura_atualizado_em timestamptz,
  -- Guarda a URL do PDF assinado (com as páginas de certificação da ClickSign), disponível a
  -- partir do momento em que o acordo é fechado — mesmo papel de `contratos.arquivo_url`.
  add column arquivo_url text;

create index if not exists acordos_assinatura_document_key_idx
  on public.acordos (assinatura_document_key);
