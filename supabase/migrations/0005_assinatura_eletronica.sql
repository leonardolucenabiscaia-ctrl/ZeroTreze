-- Integração com a AssinaDoc: cada contrato criado é automaticamente enviado para assinatura
-- eletrônica do cliente. Estas colunas rastreiam a solicitação — preenchidas no envio
-- (`criarContrato`) e atualizadas pelo webhook (`/api/webhooks/assinadoc`) conforme o status
-- muda (aberto, assinado, recusado etc.).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.contratos
  add column assinatura_request_id bigint,
  add column assinatura_document_key text,
  add column assinatura_signing_key text,
  add column assinatura_status text,
  add column assinatura_enviado_em timestamptz,
  add column assinatura_atualizado_em timestamptz;

create index if not exists contratos_assinatura_document_key_idx
  on public.contratos (assinatura_document_key);
