-- Guarda o envelopeId da ClickSign (antes descartado) — necessário pra buscar o PDF assinado
-- via API depois que o webhook confirma que todo mundo assinou (`document_closed`), já que a
-- ClickSign exige o envelopeId pra consultar o documento (não dá pra buscar só pelo documentId).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.contratos
  add column assinatura_envelope_id text;
