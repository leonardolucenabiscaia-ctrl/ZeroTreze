-- Índice em parcelas.contrato_id — toda consulta de parcelas (aba Financeiro, sincronização de
-- vencidas, fila de conferência) filtra por esse campo, e não havia índice nele desde o schema
-- inicial (full table scan em produção).
create index if not exists idx_parcelas_contrato_id on public.parcelas (contrato_id);
