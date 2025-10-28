-- ============================================================================
-- 035_pf_net_by_period_json.sql - RPC com Parâmetro JSON Único
-- ============================================================================
-- PROPÓSITO:
-- - Evitar problemas de ordem de parâmetros e cache de schema
-- - Usar um único parâmetro JSONB (mesmo padrão do create_card_installments)
-- - Manter todas as validações e normalizações
--
-- VANTAGENS:
-- - Ordem dos campos no JSON não importa
-- - Fácil adicionar novos campos opcionais
-- - Não precisa de múltiplas assinaturas
-- - Cliente envia objeto JavaScript direto
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Remover versões antigas (limpeza completa)
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.pf_net_by_period(date, date);
drop function if exists public.pf_net_by_period(jsonb);

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Nova versão: único parâmetro JSON
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
    -- Extrai datas do JSON (aceita "YYYY-MM-DD")
    select
      (p->>'date_from')::date as dfrom_raw,
      (p->>'date_to')::date   as dto_raw
  ),
  params as (
    -- Trata NULL: usa data de hoje no timezone Brasil
    select
      coalesce(dfrom_raw, (now() at time zone 'America/Sao_Paulo')::date) as dfrom0,
      coalesce(dto_raw,   (now() at time zone 'America/Sao_Paulo')::date) as dto0
    from raw
  ),
  norm as (
    -- Normaliza intervalo: inverte automaticamente se from > to
    select
      least(dfrom0, dto0) as dfrom,
      greatest(dfrom0, dto0) as dto
    from params
  ),
  tx as (
    -- Agrega transações no intervalo normalizado
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
-- 3) Permissões
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.pf_net_by_period(jsonb) from public;
grant execute on function public.pf_net_by_period(jsonb) to authenticated;

-- Comentário
comment on function public.pf_net_by_period is 
  'Versão JSON: calcula receitas, despesas e líquido em período específico. Recebe objeto JSON com date_from e date_to (YYYY-MM-DD). Trata NULL, inverte intervalo se necessário, sempre retorna 1 linha.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Verificação final (opcional)
-- ────────────────────────────────────────────────────────────────────────────
-- Descomentar para testar:
/*
SELECT * FROM pf_net_by_period(
  jsonb_build_object(
    'date_from', '2025-01-01',
    'date_to', '2025-01-31'
  )
);
*/




