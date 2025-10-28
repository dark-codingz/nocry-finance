-- ============================================================================
-- 035_pf_net_by_period_fix.sql - Versão Robusta do Saldo Líquido por Período
-- ============================================================================
-- PROPÓSITO:
-- - Tornar a RPC à prova de nulos e intervalos invertidos
-- - Sempre retornar 1 linha (mesmo sem dados)
-- - Normalizar datas automaticamente
--
-- MELHORIAS:
-- - NULL → usa data de hoje (timezone Brasil)
-- - from > to → inverte automaticamente (least/greatest)
-- - Sempre retorna valores (coalesce para 0)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: pf_net_by_period (versão robusta)
-- ────────────────────────────────────────────────────────────────────────────
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
  with params as (
    -- Tratar NULL: usa data de hoje no timezone Brasil
    select
      coalesce(p_date_from, (now() at time zone 'America/Sao_Paulo')::date) as dfrom_raw,
      coalesce(p_date_to,   (now() at time zone 'America/Sao_Paulo')::date) as dto_raw
  ),
  norm as (
    -- Normalizar intervalo: inverte automaticamente se from > to
    select
      least(dfrom_raw, dto_raw) as dfrom,
      greatest(dfrom_raw, dto_raw) as dto
    from params
  ),
  tx as (
    -- Agregar transações no intervalo normalizado
    select
      sum(case when t.type = 'income'  then t.amount_cents else 0 end)::bigint as inc,
      sum(case when t.type = 'expense' then t.amount_cents else 0 end)::bigint as exp
    from public.transactions t, norm n
    where t.user_id = auth.uid()
      and t.type in ('income','expense')   -- ignora 'transfer'
      and t.occurred_at >= n.dfrom
      and t.occurred_at <= n.dto
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

-- Comentário atualizado
comment on function public.pf_net_by_period is 
  'Versão robusta: calcula receitas, despesas e líquido em período específico. Trata NULL (usa hoje), inverte intervalo se necessário, sempre retorna 1 linha.';




