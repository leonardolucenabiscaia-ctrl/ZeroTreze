-- Ao criar um acordo, o administrador pode escolher quais parcelas do contrato (em aberto ou
-- vencidas) estão sendo cobertas por ele. Essas parcelas passam para o status "renegociado" e
-- ficam ligadas ao acordo — saem das somas de "em aberto" do Financeiro normal (agora são pagas
-- via o cronograma do acordo, em Financeiro Acordos), mas continuam no histórico.
--
-- 100% aditivo: só adiciona uma coluna e amplia a lista de status permitidos (nenhum dado é
-- apagado ou alterado).
--
-- Como aplicar: cole numa consulta NOVA (em branco) do SQL Editor do painel do Supabase e rode.

alter table public.parcelas
  add column acordo_id uuid references public.acordos (id) on delete set null;

-- Descobre o nome de verdade da constraint de status (gerado automaticamente pelo Postgres, pode
-- não ser previsível) em vez de arriscar um DROP CONSTRAINT com nome errado.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'public.parcelas'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if nome_constraint is not null then
    execute format('alter table public.parcelas drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.parcelas
  add constraint parcelas_status_check
    check (status in ('pago', 'em_aberto', 'vencido', 'aguardando_confirmacao', 'renegociado'));
