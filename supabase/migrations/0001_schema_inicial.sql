-- Zero Treze Transportes — schema inicial
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do painel do Supabase
-- (https://supabase.com/dashboard/project/_/sql/new) e clique em "Run".
--
-- Este schema ainda NÃO está conectado ao app (nenhuma tela consulta essas
-- tabelas ainda) — é só a fundação para as próximas etapas (migrar
-- autenticação e a camada de serviços). RLS fica habilitado em toda tabela,
-- sem políticas ainda (nega tudo por padrão), o que é seguro nesse estado.

create extension if not exists pgcrypto;

-- =========================================================================
-- IDENTIDADE
-- =========================================================================

-- Perfil do usuário — 1:1 com auth.users (id compartilhado). A senha em si
-- fica inteiramente a cargo do Supabase Auth, não existe coluna de senha aqui.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text not null default '',
  cpf_cnpj text not null default '',
  perfil text not null default 'cliente'
    check (perfil in ('cliente', 'operador', 'gestor', 'administrador')),
  foto_url text,
  preferencias_notificacao jsonb not null default
    '{"sms": true, "whatsapp": true, "email": true, "push": true}'::jsonb,
  criado_em timestamptz not null default now()
);

-- Cria automaticamente a linha de perfil quando um usuário se cadastra no
-- Supabase Auth. Campos extras (nome, telefone, cpf_cnpj, perfil) vêm de
-- `options.data` passado para `supabase.auth.signUp(...)`.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, telefone, cpf_cnpj, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf_cnpj', ''),
    coalesce(new.raw_user_meta_data ->> 'perfil', 'cliente')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dados específicos de clientes (perfis "cliente"). Endereço, CNH e dados
-- bancários vêm achatados como colunas — baixa complexidade, sem necessidade
-- de tabela própria.
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios (id) on delete cascade,
  nome text not null,
  tipo_documento text not null check (tipo_documento in ('cpf', 'cnpj')),
  documento text not null,
  rg text not null default '',
  nacionalidade text not null default '',
  profissao text not null default '',
  data_nascimento date,
  cnh_numero text not null default '',
  cnh_validade date,
  endereco_logradouro text not null default '',
  endereco_numero text not null default '',
  endereco_complemento text,
  endereco_bairro text not null default '',
  endereco_cidade text not null default '',
  endereco_estado text not null default '',
  endereco_cep text not null default '',
  banco text not null default '',
  agencia text not null default '',
  conta text not null default '',
  chave_pix text not null default '',
  cliente_desde timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.clientes (id) on delete cascade,
  pontuacao integer not null default 0,
  categoria text not null default 'bronze'
    check (categoria in ('bronze', 'prata', 'ouro', 'platina', 'diamante')),
  pontualidade_pagamentos numeric not null default 100,
  quantidade_atrasos integer not null default 0,
  tempo_como_cliente_meses integer not null default 0,
  conservacao_veiculo numeric not null default 100,
  quantidade_contratos integer not null default 0,
  quantidade_ocorrencias integer not null default 0
);

create table public.historico_score (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references public.scores (id) on delete cascade,
  data timestamptz not null default now(),
  pontuacao integer not null
);

-- =========================================================================
-- FROTA E CONTRATOS
-- =========================================================================

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  marca text not null,
  ano integer not null,
  cor text not null default '',
  placa text not null unique,
  renavam text not null default '',
  chassi text not null default '',
  categoria text not null default '',
  combustivel text not null default '',
  quilometragem integer not null default 0,
  foto_url text,
  proxima_revisao date,
  ultima_revisao date,
  seguradora text not null default '',
  numero_apolice text not null default '',
  assistencia_247 boolean not null default true,
  garantia_ate date,
  bloqueado boolean not null default false,
  bloqueado_em timestamptz
);

create table public.historico_manutencao (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  data date not null,
  km integer not null default 0,
  descricao text not null,
  oficina text not null default ''
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  -- ON DELETE RESTRICT (não CASCADE): um veículo é um recurso da frota
  -- compartilhado entre vários contratos ao longo do tempo — apagar o
  -- veículo não deve apagar o histórico de contratos dele.
  veiculo_id uuid not null references public.veiculos (id) on delete restrict,
  status text not null default 'em_dia'
    check (status in ('em_dia', 'vence_em_breve', 'atraso', 'encerrado')),
  data_inicio date not null,
  data_fim date not null,
  valor_parcela numeric not null,
  valor_caucao numeric not null default 0,
  limite_renovacao numeric not null default 0,
  arquivo_url text,
  criado_em timestamptz not null default now()
);

create table public.aditivos_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  tipo text not null check (tipo in ('aditivo', 'renovacao')),
  descricao text not null,
  data date not null,
  arquivo_url text
);

-- =========================================================================
-- FINANCEIRO
-- =========================================================================

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  numero integer not null,
  competencia text not null,
  valor_original numeric not null,
  data_vencimento date not null,
  data_pagamento timestamptz,
  status text not null default 'em_aberto'
    check (status in ('pago', 'em_aberto', 'vencido', 'aguardando_confirmacao')),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto')),
  data_envio_comprovante timestamptz,
  -- Desconto administrativo (ver ParcelaDetalheDialog) — achatado direto na
  -- parcela por ser um objeto único e opcional.
  desconto_multa boolean not null default false,
  desconto_percentual numeric check (desconto_percentual between 0 and 100),
  desconto_valor_fixo numeric check (desconto_valor_fixo >= 0),
  desconto_aplicado_por_nome text,
  desconto_aplicado_em timestamptz
);

create table public.movimentos_extrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  descricao text not null,
  data timestamptz not null default now(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric not null,
  saldo numeric not null
);

-- Singleton (uma única linha, id fixo = 1) — parâmetros globais de multa/
-- juros/correção usados no cálculo de valor atualizado das parcelas.
create table public.parametros_financeiros (
  id smallint primary key default 1 check (id = 1),
  percentual_multa numeric not null,
  juros_mora_diario_reais numeric not null,
  indice_correcao_mensal numeric not null
);

insert into public.parametros_financeiros (percentual_multa, juros_mora_diario_reais, indice_correcao_mensal)
values (20, 5, 0.5);

create table public.regras_cobranca (
  id uuid primary key default gen_random_uuid(),
  offset_dias integer not null,
  canais text[] not null default '{}',
  mensagem text not null,
  ativa boolean not null default true
);

insert into public.regras_cobranca (offset_dias, canais, mensagem, ativa) values
  (-7, array['email'], 'Sua parcela vence em 7 dias.', true),
  (-3, array['email', 'whatsapp'], 'Sua parcela vence em 3 dias.', true),
  (0, array['email', 'whatsapp', 'sms'], 'Sua parcela vence hoje.', true),
  (1, array['whatsapp', 'sms'], 'Sua parcela venceu ontem.', true),
  (5, array['whatsapp', 'sms'], 'Sua parcela está em atraso há 5 dias.', true),
  (10, array['whatsapp', 'sms', 'email'], 'Regularize sua parcela em atraso.', true),
  (15, array['whatsapp', 'sms', 'email'], 'Atraso crítico — entre em contato conosco.', false);

create table public.notificacoes_cobranca (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  canais text[] not null default '{}',
  destinatario text not null check (destinatario in ('cliente_especifico', 'todos_em_atraso')),
  cliente_id uuid references public.clientes (id) on delete set null,
  cliente_nome text,
  clientes_alcancados integer not null default 0,
  enviado_por_nome text not null,
  enviado_em timestamptz not null default now()
);

-- =========================================================================
-- MULTAS, ACORDOS, DOCUMENTOS
-- =========================================================================

create table public.multas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  numero_auto text not null,
  orgao text not null,
  data date not null,
  descricao text not null,
  valor numeric not null,
  vencimento date not null,
  situacao text not null default 'pendente'
    check (situacao in ('pendente', 'paga', 'vencida', 'recorrida')),
  pontos integer not null default 0,
  data_registro date not null default current_date,
  anexo_url text,
  -- Enquanto nulo, bloqueia o portal do cliente até a ciência ser confirmada.
  ciencia_em timestamptz
);

create table public.acordos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  valor_total numeric not null,
  valor_entrada numeric not null default 0,
  situacao text not null default 'ativo'
    check (situacao in ('ativo', 'quitado', 'rompido')),
  descricao text,
  criado_em timestamptz not null default now()
);

create table public.parcelas_acordo (
  id uuid primary key default gen_random_uuid(),
  acordo_id uuid not null references public.acordos (id) on delete cascade,
  numero integer not null,
  valor numeric not null,
  vencimento date not null,
  pago boolean not null default false
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete cascade,
  contrato_id uuid references public.contratos (id) on delete cascade,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  parcela_id uuid references public.parcelas (id) on delete set null,
  acordo_id uuid references public.acordos (id) on delete set null,
  categoria text not null check (categoria in (
    'contrato', 'crlv', 'licenciamento', 'apolice', 'comprovante',
    'boleto', 'nota_fiscal', 'recibo', 'cadastro', 'acordo'
  )),
  nome text not null,
  url text not null,
  tamanho_kb integer not null default 0,
  criado_em timestamptz not null default now()
);

-- =========================================================================
-- ATENDIMENTO
-- =========================================================================

create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  contrato_id uuid references public.contratos (id) on delete set null,
  categoria text not null check (categoria in (
    'financeiro', 'manutencao', 'documentacao', 'acidente', 'troca_veiculo', 'duvidas'
  )),
  titulo text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'encerrado')),
  prioridade text not null default 'baixa'
    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor_id uuid references public.usuarios (id) on delete set null,
  autor_nome text not null,
  autor_perfil text not null check (autor_perfil in ('cliente', 'operador', 'gestor', 'administrador')),
  texto text,
  anexo_tipo text check (anexo_tipo in ('imagem', 'video', 'documento', 'audio', 'localizacao')),
  anexo_nome text,
  anexo_url text,
  enviada_em timestamptz not null default now(),
  status text not null default 'enviada' check (status in ('enviada', 'entregue', 'lida'))
);

-- Existência de avaliação de um chamado é consultada por `chamado_id` aqui,
-- não por um ponteiro reverso redundante em `chamados`.
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null unique references public.chamados (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nota_atendimento smallint not null check (nota_atendimento between 1 and 5),
  nota_tempo smallint not null check (nota_tempo between 1 and 5),
  nota_qualidade smallint not null check (nota_qualidade between 1 and 5),
  nota_educacao smallint not null check (nota_educacao between 1 and 5),
  nota_resolucao smallint not null check (nota_resolucao between 1 and 5),
  comentario text,
  criada_em timestamptz not null default now()
);

create table public.solicitacoes_assistencia (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  tipo text not null check (tipo in (
    'guincho', 'pane_mecanica', 'pane_eletrica', 'chaveiro',
    'troca_pneu', 'acidente', 'bateria', 'falta_combustivel'
  )),
  status text not null default 'solicitado'
    check (status in ('solicitado', 'a_caminho', 'em_atendimento', 'concluido', 'cancelado')),
  latitude numeric,
  longitude numeric,
  tempo_estimado_min integer not null default 0,
  criado_em timestamptz not null default now()
);

-- =========================================================================
-- NOTIFICAÇÕES E AUDITORIA
-- =========================================================================

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null check (tipo in (
    'parcela_vence_amanha', 'pagamento_confirmado', 'pagamento_recusado',
    'nova_multa', 'multa_ciencia_confirmada', 'desconto_parcela_aplicado',
    'cobranca_manual', 'acordo_criado', 'contrato_vencendo',
    'revisao_agendada', 'documento_disponivel', 'chat_respondido'
  )),
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  link text
);

-- usuario_id fica com ON DELETE SET NULL (não CASCADE): o rastro de
-- auditoria deve sobreviver mesmo que a conta de quem agiu seja removida.
create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id) on delete set null,
  usuario_nome text not null,
  acao text not null,
  entidade text not null,
  entidade_id text not null,
  criado_em timestamptz not null default now()
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
-- Habilitado em toda tabela, sem políticas ainda (nega tudo por padrão).
-- Políticas de verdade, alinhadas a `RECURSOS_POR_PERFIL` (permissions.ts),
-- ficam para quando a camada de serviços for migrada.

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.scores enable row level security;
alter table public.historico_score enable row level security;
alter table public.veiculos enable row level security;
alter table public.historico_manutencao enable row level security;
alter table public.contratos enable row level security;
alter table public.aditivos_contrato enable row level security;
alter table public.parcelas enable row level security;
alter table public.movimentos_extrato enable row level security;
alter table public.parametros_financeiros enable row level security;
alter table public.regras_cobranca enable row level security;
alter table public.notificacoes_cobranca enable row level security;
alter table public.multas enable row level security;
alter table public.acordos enable row level security;
alter table public.parcelas_acordo enable row level security;
alter table public.documentos enable row level security;
alter table public.chamados enable row level security;
alter table public.mensagens enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.solicitacoes_assistencia enable row level security;
alter table public.notificacoes enable row level security;
alter table public.auditoria enable row level security;
