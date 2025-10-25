-- ============================================================================
-- Migration: 029_loans_patch
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar colunas de juros/config em loans (se faltarem)
-- - Recriar view loans_summary e RPC apply_monthly_interest
-- - Garantir RLS e índices
-- - Idempotente: não quebra dados existentes
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 🔧 Adiciona colunas de juros/config em loans (se faltarem)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loans
  add column if not exists interest_mode text not null default 'none' check (interest_mode in ('none','simple','compound_monthly')),
  add column if not exists interest_rate_bps integer not null default 0,
  add column if not exists last_interest_applied_at date,
  add column if not exists status text not null default 'active' check (status in ('active','closed','archived'));

-- Adiciona colunas de compatibilidade (se faltarem)
alter table public.loans
  add column if not exists started_at date not null default (now() at time zone 'America/Sao_Paulo')::date,
  add column if not exists person_name text,
  add column if not exists notes text;

-- Popula person_name e notes com valores de person/note (se existirem)
update public.loans
set person_name = person
where person_name is null and person is not null;

update public.loans
set notes = note
where notes is null and note is not null;

-- Torna person_name not null (se já tiver valores)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='loans' and column_name='person_name') then
    alter table public.loans alter column person_name set not null;
  end if;
exception when others then
  -- Se falhar, significa que há valores null, então ignora
  null;
end $$;

-- Garante default de user_id (caso falte)
alter table public.loans
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS em loans (se não estiver ligado)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='loans' and policyname='Loans: manage own'
  ) then
    create policy "Loans: manage own" on public.loans
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 🔄 Garante tabela de eventos e RLS (caso ainda não exista)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  type text not null check (type in ('disbursement','topup','repayment','interest')),
  amount_cents bigint not null check (amount_cents > 0),
  occurred_at date not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.loan_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='loan_events' and policyname='LoanEvents: manage own'
  ) then
    create policy "LoanEvents: manage own" on public.loan_events
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Índices
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_loans_user_id on public.loans(user_id);
create index if not exists idx_loans_status on public.loans(user_id, status);
create index if not exists idx_loan_events_user_id_loan_id on public.loan_events(user_id, loan_id);
create index if not exists idx_loan_events_occurred_at on public.loan_events(loan_id, occurred_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 👓 Recria view de resumo (usa novas colunas)
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.loans_summary as
select
  l.id,
  l.user_id,
  l.person_name,
  l.started_at,
  l.notes,
  l.interest_mode,
  l.interest_rate_bps,
  l.last_interest_applied_at,
  l.status,
  l.created_at,
  coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end), 0)::bigint as principal_cents,
  coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0)::bigint as paid_cents,
  coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0)::bigint as interest_cents,
  (
    coalesce(sum(case when e.type in ('disbursement','topup','interest') then e.amount_cents else 0 end), 0)
    - coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0)
  )::bigint as balance_cents
from public.loans l
left join public.loan_events e
  on e.loan_id = l.id and e.user_id = l.user_id
where l.user_id = auth.uid()
group by l.id;

comment on view public.loans_summary is
  'Resumo (principal, pagos, juros, saldo) por empréstimo do usuário.';

-- ────────────────────────────────────────────────────────────────────────────
-- ⚙️ RPC: aplicar juros do período
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.apply_monthly_interest(p_loan_id uuid, p_until date)
returns void
language plpgsql
security definer
as $$
declare
  v_loan record;
  v_from date;
  v_days integer;
  v_months integer;
  v_rate_monthly numeric;
  v_principal bigint;
  v_paid bigint;
  v_interest_so_far bigint;
  v_balance_before bigint;
  v_interest_to_add bigint;
begin
  -- Buscar empréstimo
  select * into v_loan from public.loans where id = p_loan_id and user_id = auth.uid();
  if not found then
    raise exception 'Empréstimo não encontrado';
  end if;

  -- Se não tem juros configurado, não faz nada
  if v_loan.interest_mode = 'none' or v_loan.interest_rate_bps <= 0 then
    return;
  end if;

  -- Determinar período de cálculo
  v_from := coalesce(v_loan.last_interest_applied_at, v_loan.started_at);
  if p_until <= v_from then
    return; -- nada a aplicar
  end if;

  -- Buscar saldos atuais (antes do novo juros)
  select
    coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end), 0),
    coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0),
    coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0)
  into v_principal, v_paid, v_interest_so_far
  from public.loan_events e
  where e.loan_id = v_loan.id and e.user_id = v_loan.user_id;

  -- Saldo antes dos novos juros
  v_balance_before := (v_principal + v_interest_so_far) - v_paid;
  
  if v_balance_before <= 0 then
    -- Já quitado, apenas atualiza data de controle
    update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
    return;
  end if;

  -- Taxa mensal (converter de bps para decimal)
  v_rate_monthly := (v_loan.interest_rate_bps::numeric / 10000.0);

  -- Calcular juros conforme modo
  if v_loan.interest_mode = 'simple' then
    -- Juros simples proporcional por dias
    -- J = saldo × taxa_mensal × (dias/30)
    v_days := (p_until - v_from);
    v_interest_to_add := round(v_balance_before * v_rate_monthly * (v_days::numeric / 30.0));
    
  elsif v_loan.interest_mode = 'compound_monthly' then
    -- Juros compostos mensais
    -- Calcula quantidade de meses completos entre v_from e p_until
    v_months := (extract(year from age(p_until, v_from)) * 12 + extract(month from age(p_until, v_from)))::int;
    
    if v_months <= 0 then
      -- Menos de 1 mês, não aplica juros compostos
      update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
      return;
    end if;
    
    -- J = saldo × ((1 + taxa)^meses - 1)
    v_interest_to_add := round(v_balance_before * (power(1 + v_rate_monthly, v_months) - 1));
  else
    return;
  end if;

  -- Se não há juros a adicionar, só atualiza controle
  if v_interest_to_add <= 0 then
    update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
    return;
  end if;

  -- Criar evento de juros
  insert into public.loan_events (user_id, loan_id, type, amount_cents, occurred_at, notes)
  values (
    auth.uid(),
    v_loan.id,
    'interest',
    v_interest_to_add,
    p_until,
    format('Juros aplicados via RPC (modo: %s, taxa: %s bps)', v_loan.interest_mode, v_loan.interest_rate_bps)
  );

  -- Atualizar controle de última aplicação
  update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
end;
$$;

-- Permissões (apenas authenticated pode executar)
revoke all on function public.apply_monthly_interest(uuid, date) from public;
grant execute on function public.apply_monthly_interest(uuid, date) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on column public.loans.interest_mode is
  'Modo de cálculo de juros: none (sem juros), simple (proporcional por dias), compound_monthly (capitalização mensal).';

comment on column public.loans.interest_rate_bps is
  'Taxa de juros mensal em basis points (250 = 2,50% ao mês).';

comment on column public.loans.last_interest_applied_at is
  'Data da última aplicação automática de juros (controle para evitar duplicação).';

comment on column public.loans.status is
  'Status: active (ativo), closed (quitado), archived (arquivado).';

comment on function public.apply_monthly_interest(uuid, date) is
  'Calcula e aplica juros do período automaticamente conforme configuração do empréstimo.';

