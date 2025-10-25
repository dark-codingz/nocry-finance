-- ============================================================================
-- 034_pf_monthly_series.sql - Série Mensal de Finanças Pessoais
-- ============================================================================
-- PROPÓSITO:
-- - Retornar série temporal mensal (YYYY-MM) de receitas, despesas e líquido
-- - Preencher meses sem movimento com zero
-- - Default: últimos 12 meses até o mês atual
-- - Para gráficos mensais no dashboard
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: pf_monthly_series
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.pf_monthly_series(p_months_back int default 12)
returns table (
  month_key text,               -- 'YYYY-MM'
  total_income_cents bigint,
  total_expense_cents bigint,
  net_cents bigint
)
language sql
security definer
as $$
with params as (
  -- Mês atual no timezone do Brasil
  select
    date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date as month_now,
    greatest(p_months_back, 1) as months_back
),
series as (
  -- Gera série de meses de 0 até (months_back - 1) meses atrás
  select 
    to_char((p.month_now - (i || ' months')::interval)::date, 'YYYY-MM') as month_key,
    date_trunc('month', (p.month_now - (i || ' months')::interval)::date)::date as month_start,
    (date_trunc('month', (p.month_now - (i || ' months')::interval)::date) + interval '1 month - 1 day')::date as month_end
  from params p,
       generate_series(0, (select months_back from params) - 1) as gs(i)
),
tx_agg as (
  -- Agregar transações do usuário autenticado por mês
  select
    to_char(date_trunc('month', t.occurred_at), 'YYYY-MM') as m_key,
    sum(case when t.type = 'income' then t.amount_cents else 0 end)::bigint as income_cents,
    sum(case when t.type = 'expense' then t.amount_cents else 0 end)::bigint as expense_cents
  from public.transactions t
  where t.user_id = auth.uid()
  group by 1
)
select
  s.month_key,
  coalesce(a.income_cents, 0) as total_income_cents,
  coalesce(a.expense_cents, 0) as total_expense_cents,
  coalesce(a.income_cents, 0) - coalesce(a.expense_cents, 0) as net_cents
from series s
left join tx_agg a on a.m_key = s.month_key
order by s.month_key;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Permissões
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.pf_monthly_series(int) from public;
grant execute on function public.pf_monthly_series(int) to authenticated;

-- Comentário
comment on function public.pf_monthly_series is 
  'Retorna série mensal de receitas, despesas e líquido para o usuário autenticado. Preenche meses sem movimento com zero. Default: últimos 12 meses.';



