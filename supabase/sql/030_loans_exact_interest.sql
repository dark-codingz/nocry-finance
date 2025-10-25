-- ============================================================================
-- Migration: 030_loans_exact_interest
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar modo "exact" de juros (valor fixo em vez de calculado)
-- - Adicionar coluna interest_exact_cents para armazenar valor fixo
-- - Atualizar view loans_summary para incluir juros exato no saldo
-- - Atualizar RPC apply_monthly_interest para ignorar modo "exact"
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Ampliar CHECK constraint de interest_mode para incluir 'exact'
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1
    from information_schema.constraint_column_usage ccu
    join information_schema.table_constraints tc
      on tc.constraint_name = ccu.constraint_name
    where tc.table_schema='public' and tc.table_name='loans'
      and tc.constraint_type='CHECK' and ccu.column_name='interest_mode'
  ) then
    alter table public.loans drop constraint if exists loans_interest_mode_check;
  end if;
end $$;

alter table public.loans
  add constraint loans_interest_mode_check
  check (interest_mode in ('none','simple','compound_monthly','exact'));

comment on constraint loans_interest_mode_check on public.loans is
  'Modos de juros: none (sem juros), simple (proporcional), compound_monthly (capitalização mensal), exact (valor fixo)';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Adicionar coluna para armazenar valor fixo de juros (centavos)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loans
  add column if not exists interest_exact_cents bigint not null default 0;

comment on column public.loans.interest_exact_cents is
  'Valor fixo de juros (em centavos) quando interest_mode = "exact". Somado ao saldo.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Recriar VIEW loans_summary incluindo juros exato no cálculo
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.loans_summary as
with ev as (
  select
    l.id as loan_id,
    coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end),0)::bigint as principal_cents,
    coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end),0)::bigint as paid_cents,
    coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end),0)::bigint as interest_events_cents
  from public.loans l
  left join public.loan_events e
    on e.loan_id = l.id and e.user_id = l.user_id
  where l.user_id = auth.uid()
  group by l.id
)
select
  l.id,
  l.user_id,
  l.person_name,
  l.started_at,
  l.notes,
  l.interest_mode,
  l.interest_rate_bps,
  l.interest_exact_cents,                     -- ✅ Novo campo na view
  l.last_interest_applied_at,
  l.status,
  l.created_at,
  ev.principal_cents,
  ev.paid_cents,
  ev.interest_events_cents,
  -- interest_cents: soma de eventos de juros + juros exato
  (ev.interest_events_cents + l.interest_exact_cents)::bigint as interest_cents,
  -- balance_cents: principal + juros (eventos + exato) - pagamentos
  ( ev.principal_cents + ev.interest_events_cents + l.interest_exact_cents - ev.paid_cents )::bigint as balance_cents
from public.loans l
join ev on ev.loan_id = l.id
where l.user_id = auth.uid();

comment on view public.loans_summary is
  'Resumo por empréstimo. interest_cents = juros de eventos + juros exato. balance_cents = principal + interest_cents - paid_cents.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Atualizar RPC apply_monthly_interest para ignorar modo "exact"
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
  v_rate_monthly numeric;
  v_principal bigint;
  v_paid bigint;
  v_interest_so_far bigint;
  v_balance_before bigint;
  v_interest_to_add bigint;
begin
  select * into v_loan from public.loans where id = p_loan_id and user_id = auth.uid();
  if not found then
    raise exception 'Loan not found';
  end if;

  -- ✅ NOVO: Se modo "exact", não aplica juros automaticamente
  if v_loan.interest_mode = 'exact' then
    return;
  end if;

  if v_loan.interest_mode = 'none' or v_loan.interest_rate_bps <= 0 then
    return;
  end if;

  v_from := coalesce(v_loan.last_interest_applied_at, v_loan.started_at);
  if p_until <= v_from then
    return;
  end if;

  -- Busca saldos atuais (eventos apenas)
  select
    coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end),0),
    coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end),0),
    coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end),0)
  into v_principal, v_paid, v_interest_so_far
  from public.loan_events e
  where e.loan_id = v_loan.id and e.user_id = v_loan.user_id;

  -- ✅ Inclui interest_exact_cents no cálculo do saldo antes de aplicar juros
  v_balance_before := (v_principal + v_interest_so_far + v_loan.interest_exact_cents) - v_paid;
  
  if v_balance_before <= 0 then
    update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
    return;
  end if;

  v_rate_monthly := (v_loan.interest_rate_bps::numeric / 10000.0);

  if v_loan.interest_mode = 'simple' then
    -- Juros simples proporcional por dias
    v_days := (p_until - v_from);
    v_interest_to_add := round( v_balance_before * v_rate_monthly * (v_days::numeric / 30.0) );
  else
    -- Juros compostos mensais
    v_days := (extract(year from age(p_until, v_from)) * 12 + extract(month from age(p_until, v_from)))::int;
    if v_days <= 0 then
      return;
    end if;
    v_interest_to_add := round( v_balance_before * ( (1+v_rate_monthly)^v_days - 1 ) );
  end if;

  if v_interest_to_add <= 0 then
    update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
    return;
  end if;

  -- Insere evento de juros
  insert into public.loan_events (user_id, loan_id, type, amount_cents, occurred_at, notes)
  values (auth.uid(), v_loan.id, 'interest', v_interest_to_add, p_until, 'Juros aplicados via RPC');

  update public.loans set last_interest_applied_at = p_until where id = v_loan.id;
end;
$$;

revoke all on function public.apply_monthly_interest(uuid, date) from public;
grant execute on function public.apply_monthly_interest(uuid, date) to authenticated;

comment on function public.apply_monthly_interest(uuid, date) is
  'Aplica juros automáticos do período. Ignora modo "exact" (juros fixo).';

-- ────────────────────────────────────────────────────────────────────────────
-- NOTA: Se erro de "schema cache" persistir:
-- Supabase Dashboard → Settings → API → Reset cache
-- ────────────────────────────────────────────────────────────────────────────



