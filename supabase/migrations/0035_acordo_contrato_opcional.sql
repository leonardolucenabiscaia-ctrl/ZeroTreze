-- Permite criar acordo sem vincular a um contrato cadastrado no sistema — usado para
-- renegociações de contratos antigos que nunca foram digitalizados/registrados aqui. O PDF e o
-- envio para assinatura eletrônica já tratam esse caso (ver acordos.service.ts / acordo-pdf.tsx).
alter table public.acordos alter column contrato_id drop not null;
