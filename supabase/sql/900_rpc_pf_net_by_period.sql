-- ============================================================================
-- 900_rpc_pf_net_by_period.sql - RPC Consolidada (JSON)
-- ============================================================================
-- PROPÓSITO:
-- - Versão ÚNICA e DEFINITIVA da RPC pf_net_by_period
-- - Usa parâmetro JSON (evita problemas de ordem/cache)
-- - Inclui NOTIFY para auto-reload do schema cache
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Limpeza: remover TODAS as versões antigas
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.pf_net_by_period(date, date);
drop function if exists public.pf_net_by_period(jsonb);

-- ────────────────────────────────────────────────────────────────────────────
-- Versão ÚNICA (JSON): soma receitas e despesas no período
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.pf_net_by_period(p jsonb)
returns table (
  total_income_cents  bigint,
  total_expense_cents bigint,
  net_cents           bigint
)
language sql
security definer
as $$
  with raw as (
    select
      (p->>'date_from')::date as dfrom_raw,
      (p->>'date_to')::date   as dto_raw
  ),
  params as (
    select
      coalesce(dfrom_raw, (now() at time zone 'America/Sao_Paulo')::date) as dfrom0,
      coalesce(dto_raw,   (now() at time zone 'America/Sao_Paulo')::date) as dto0
    from raw
  ),
  norm as (
    select least(dfrom0, dto0) as dfrom, greatest(dfrom0, dto0) as dto
    from params
  ),
  tx as (
    select
      sum(case when t.type = 'income'  then t.amount_cents else 0 end)::bigint as inc,
      sum(case when t.type = 'expense' then t.amount_cents else 0 end)::bigint as exp
    from public.transactions t, norm n
    where t.user_id = auth.uid()
      and t.type in ('income','expense')
      and t.occurred_at >= n.dfrom
      and t.occurred_at <= n.dto
  )
  select
    coalesce(inc,0)  as total_income_cents,
    coalesce(exp,0)  as total_expense_cents,
    coalesce(inc,0) - coalesce(exp,0) as net_cents
  from tx;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Permissões
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.pf_net_by_period(jsonb) from public;
grant execute on function public.pf_net_by_period(jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Reload automático do schema cache (PostgREST)
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';




