-- Checklist de vistoria do contrato (pneus/odômetro/lataria/bateria + observação + anexos) — um
-- registro só por contrato, sem histórico de versões anteriores, editável pelo admin/equipe.
-- Os anexos reaproveitam a tabela `documentos` já existente (mesmo bucket privado e link
-- assinado temporário usado pelos comprovantes de pagamento), só com a categoria nova abaixo.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.contratos
  add column checklist_pneus_ok boolean,
  add column checklist_odometro_ok boolean,
  add column checklist_odometro_km integer,
  add column checklist_lataria_ok boolean,
  add column checklist_bateria_ok boolean,
  add column checklist_observacao text,
  add column checklist_atualizado_por_nome text,
  add column checklist_atualizado_em timestamptz;

alter table public.documentos drop constraint documentos_categoria_check;
alter table public.documentos add constraint documentos_categoria_check check (categoria in (
  'contrato', 'crlv', 'licenciamento', 'apolice', 'comprovante',
  'boleto', 'nota_fiscal', 'recibo', 'cadastro', 'acordo', 'checklist'
));
