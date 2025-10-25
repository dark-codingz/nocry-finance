-- ============================================================================
-- 035_pf_net_by_period.sql - Saldo Líquido por Período
-- ============================================================================
-- PROPÓSITO:
-- - Calcular Entradas, Despesas e Líquido em um período específico
-- - Para o card "Saldo Líquido" do Dashboard
-- - Respeita filtro de datas (from/to)
-- - Ignora transferências (apenas income/expense)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: pf_net_by_period
-- ────────────────────────────────────────────────────────────────────────────
-- Soma receitas e despesas no intervalo [p_date_from .. p_date_to]
-- para o usuário autenticado
create or replace function public.pf_net_by_period(
  p_date_from date,
  p_date_to   date
)
returns table (
  total_income_cents  bigint,
  total_expense_cents bigint,
  net_cents           bigint
)
language sql
security definer
as $$
  with tx as (
    select
      sum(case when type = 'income'  then amount_cents else 0 end)::bigint as inc,
      sum(case when type = 'expense' then amount_cents else 0 end)::bigint as exp
    from public.transactions
    where user_id = auth.uid()
      and type in ('income','expense')   -- ignora 'transfer'
      and occurred_at >= p_date_from
      and occurred_at <= p_date_to
  )
  select
    coalesce(inc, 0)  as total_income_cents,
    coalesce(exp, 0)  as total_expense_cents,
    coalesce(inc, 0) - coalesce(exp, 0) as net_cents
  from tx;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Permissões
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.pf_net_by_period(date, date) from public;
grant execute on function public.pf_net_by_period(date, date) to authenticated;

-- Comentário
comment on function public.pf_net_by_period is 
  'Calcula total de receitas, despesas e líquido para o usuário autenticado em um período específico (inclusive). Ignora transferências.';



