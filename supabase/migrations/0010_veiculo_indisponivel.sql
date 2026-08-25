-- Estado independente do bloqueio: "indisponível" é uma pausa temporária decidida pela equipe
-- (ex.: reservado, aguardando limpeza/documentação) — diferente de "bloqueado" (uso impedido,
-- geralmente por um problema) e de "em manutenção" (mecânica/funilaria). Um veículo pode não ter
-- contrato nenhum e ainda assim precisar ficar marcado como indisponível.
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.veiculos
  add column indisponivel boolean not null default false,
  add column indisponivel_desde timestamptz;
