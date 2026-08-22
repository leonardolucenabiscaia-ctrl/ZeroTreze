-- Adiciona os 3 tipos de lembrete de parcela por WhatsApp (2 dias antes, no dia, 1 dia depois do
-- vencimento) e a tabela que evita mandar o mesmo lembrete duas vezes pra mesma parcela — usada
-- pela tarefa agendada (cron) que roda 1x por dia.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.notificacoes drop constraint notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'parcela_vence_amanha', 'pagamento_confirmado', 'pagamento_recusado',
  'nova_multa', 'multa_ciencia_confirmada', 'desconto_parcela_aplicado',
  'cobranca_manual', 'acordo_criado', 'contrato_vencendo',
  'revisao_agendada', 'documento_disponivel', 'chat_respondido',
  'parcela_falta_2_dias', 'parcela_vence_hoje', 'parcela_venceu_ontem'
));

create table public.lembretes_parcela_enviados (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references public.parcelas(id) on delete cascade,
  tipo text not null check (tipo in ('parcela_falta_2_dias', 'parcela_vence_hoje', 'parcela_venceu_ontem')),
  enviado_em timestamptz not null default now(),
  unique (parcela_id, tipo)
);

alter table public.lembretes_parcela_enviados enable row level security;
