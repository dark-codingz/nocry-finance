-- ============================================================================
-- Migration: 029_loans
-- ============================================================================
-- PROPÓSITO:
-- - Sistema completo de gestão de empréstimos
-- - Controle de desembolsos, pagamentos, aportes e juros
-- - Suporte a juros simples e compostos (configurável por empréstimo)
-- - RPC para aplicar juros automáticos do período
--
-- ESTRUTURA:
-- - loans: Registro principal do empréstimo
-- - loan_events: Eventos/extrato (disbursement, topup, repayment, interest)
-- - loans_summary: VIEW com saldos agregados
-- - apply_monthly_interest: RPC para calcular e aplicar juros
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Tabela: loans (Empréstimos)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),

  -- Informações básicas
  person_name text not null,           -- quem recebeu o empréstimo
  started_at date not null default (now() at time zone 'America/Sao_Paulo')::date,
  notes text,

  -- Configuração de juros (por empréstimo)
  interest_mode text not null default 'none' check (interest_mode in ('none','simple','compound_monthly')),
  interest_rate_bps integer not null default 0, -- taxa ao mês em basis points (ex.: 250 = 2,50%/mês)
  last_interest_applied_at date,                -- controle do último lançamento automático de juros

  -- Status
  status text not null default 'active' check (status in ('active','closed','archived')),
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Tabela: loan_events (Eventos/Extrato do Empréstimo)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  
  -- Tipo de evento
  -- disbursement: Desembolso inicial
  -- topup: Novo aporte/empréstimo adicional
  -- repayment: Pagamento recebido
  -- interest: Juros (manual ou automático)
  type text not null check (type in ('disbursement','topup','repayment','interest')),
  
  amount_cents bigint not null check (amount_cents > 0),
  occurred_at date not null,
  notes text,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS: Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loans enable row level security;
alter table public.loan_events enable row level security;

-- Políticas: Cada usuário gerencia seus próprios empréstimos
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='loans' and policyname='Loans: manage own'
  ) then
    create policy "Loans: manage own" on public.loans
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

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
-- VIEW: loans_summary (Resumo por empréstimo)
-- ────────────────────────────────────────────────────────────────────────────
-- Calcula:
-- - principal_cents: Total emprestado (disbursement + topup)
-- - paid_cents: Total recebido (repayment)
-- - interest_cents: Total de juros acumulados (interest)
-- - balance_cents: Saldo devedor (principal + interest - paid)
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
  
  -- Agregações
  coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end), 0)::bigint as principal_cents,
  coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0)::bigint as paid_cents,
  coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0)::bigint as interest_cents,
  
  -- Saldo devedor = (principal + juros) - pagamentos
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
  'Resumo (principal, pagamentos, juros, saldo) por empréstimo do usuário.';

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: apply_monthly_interest (Aplicar juros do período)
-- ────────────────────────────────────────────────────────────────────────────
-- PROPÓSITO:
-- - Calcular juros desde last_interest_applied_at (ou started_at) até p_until
-- - Criar evento 'interest' automaticamente
-- - Atualizar last_interest_applied_at
--
-- MODOS:
-- - 'simple': Juros simples proporcional por dias (J = saldo × taxa × dias/30)
-- - 'compound_monthly': Juros compostos mensais (J = saldo × ((1+taxa)^meses - 1))
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
  v_rate_monthly numeric;  -- ex.: 0.025 (2,5%)
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
    format('Juros aplicados automaticamente (modo: %s, taxa: %s bps)', v_loan.interest_mode, v_loan.interest_rate_bps)
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
comment on table public.loans is
  'Registro de empréstimos realizados pelo usuário.';

comment on column public.loans.person_name is
  'Nome da pessoa que recebeu o empréstimo.';

comment on column public.loans.interest_mode is
  'Modo de cálculo de juros: none (sem juros), simple (proporcional por dias), compound_monthly (capitalização mensal).';

comment on column public.loans.interest_rate_bps is
  'Taxa de juros mensal em basis points (250 = 2,50% ao mês).';

comment on column public.loans.last_interest_applied_at is
  'Data da última aplicação automática de juros (controle para evitar duplicação).';

comment on table public.loan_events is
  'Eventos/extrato do empréstimo (desembolsos, pagamentos, juros).';

comment on column public.loan_events.type is
  'Tipo: disbursement (desembolso inicial), topup (aporte adicional), repayment (pagamento), interest (juros).';

comment on function public.apply_monthly_interest(uuid, date) is
  'Calcula e aplica juros do período automaticamente conforme configuração do empréstimo.';




