-- /supabase/sql/040_loans.sql
-- ============================================================================
-- Sistema de Empréstimos Pessoa-a-Pessoa
-- ============================================================================
-- Propósito: Gerenciar empréstimos com registro de eventos (emprestei, recebi, juros)
-- e cálculo automático de saldos.
--
-- Modelo de Dados:
-- - loans: registro do empréstimo/dívida com uma pessoa
-- - loan_events: eventos financeiros (out=emprestei, in=recebi, interest=juros)
-- - loan_balances: view que calcula saldo por empréstimo
--
-- Valores monetários em centavos (bigint).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela: loans
-- ----------------------------------------------------------------------------
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.loans is 'Empréstimos pessoa-a-pessoa registrados pelo usuário.';
comment on column public.loans.person is 'Nome da pessoa envolvida no empréstimo.';
comment on column public.loans.note is 'Anotações sobre o empréstimo (opcional).';

-- RLS para loans
alter table public.loans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='loans' and policyname='loans_own'
  ) then
    create policy loans_own on public.loans for all
      using (auth.uid() = user_id) 
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_loans_user_id on public.loans(user_id);

-- ----------------------------------------------------------------------------
-- Tabela: loan_events
-- ----------------------------------------------------------------------------
-- Eventos financeiros relacionados a empréstimos:
-- - 'out': emprestei dinheiro (saída)
-- - 'in': recebi dinheiro de volta (entrada)
-- - 'interest': juros acumulados
create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  type text not null check (type in ('out','in','interest')),
  amount_cents bigint not null check (amount_cents > 0),
  occurred_at date not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.loan_events is 'Eventos financeiros de empréstimos (valores em centavos).';
comment on column public.loan_events.type is 'Tipo do evento: out=emprestei, in=recebi, interest=juros.';
comment on column public.loan_events.amount_cents is 'Valor do evento em centavos.';
comment on column public.loan_events.occurred_at is 'Data em que o evento ocorreu (YYYY-MM-DD).';

-- RLS para loan_events
alter table public.loan_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='loan_events' and policyname='loan_events_own'
  ) then
    create policy loan_events_own on public.loan_events for all
      using (auth.uid() = user_id) 
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_loan_events_user_id on public.loan_events(user_id);
create index if not exists idx_loan_events_loan_id_date on public.loan_events(loan_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- View: loan_balances
-- ----------------------------------------------------------------------------
-- Calcula o saldo de cada empréstimo:
-- - out_cents: total emprestado
-- - in_cents: total recebido de volta
-- - interest_cents: total de juros
-- - balance_cents: saldo atual (out + interest - in)
--
-- Nota: balance_cents > 0 significa que a pessoa ainda me deve dinheiro
--       balance_cents < 0 significa que eu devo dinheiro para a pessoa
create or replace view public.loan_balances as
select
  l.id as loan_id,
  l.user_id,
  l.person,
  l.note,
  l.created_at,
  coalesce(sum(case when e.type = 'out' then e.amount_cents else 0 end), 0)::bigint as out_cents,
  coalesce(sum(case when e.type = 'in' then e.amount_cents else 0 end), 0)::bigint as in_cents,
  coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0)::bigint as interest_cents,
  (
    coalesce(sum(case when e.type = 'out' then e.amount_cents else 0 end), 0) +
    coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0) -
    coalesce(sum(case when e.type = 'in' then e.amount_cents else 0 end), 0)
  )::bigint as balance_cents
from public.loans l
left join public.loan_events e on e.loan_id = l.id
group by l.id, l.user_id, l.person, l.note, l.created_at;

comment on view public.loan_balances is 'Saldo calculado de cada empréstimo (valores em centavos).';

-- ============================================================================
-- FIM
-- ============================================================================

