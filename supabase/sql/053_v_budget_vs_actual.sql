-- ============================================================================
-- 053_v_budget_vs_actual.sql - Materialized View: Orçamento x Realizado
-- ============================================================================
-- PROPÓSITO:
-- - Comparar orçamento definido vs gasto real (REGIME DE CAIXA)
-- - Por usuário, mês e categoria
-- - Usado em: S-curve, Desvio por Categoria, Alertas
--
-- FÓRMULA:
-- - budget = budgets.amount_cents (total do mês)
-- - actual = SUM(transactions WHERE type='expense' AND card_id IS NULL)
-- - variance = actual - budget (negativo = economia, positivo = estouro)
-- - variance_pct = (actual / budget * 100) - 100
--
-- IMPORTANTE:
-- - Apenas CAIXA (card_id IS NULL)
-- - Budget é total do mês (não por categoria, por enquanto)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.v_budget_vs_actual CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar Materialized View
-- ────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.v_budget_vs_actual AS
WITH budget_totals AS (
  -- Orçamento total por usuário e mês
  SELECT
    user_id,
    month_key AS year_month,
    amount_cents AS budget_cents
  FROM public.budgets
),
actual_cash AS (
  -- Gasto real (CAIXA) por usuário, mês e categoria
  SELECT
    user_id,
    TO_CHAR(occurred_at, 'YYYY-MM') AS year_month,
    category_id,
    SUM(amount_cents) AS actual_cents,
    COUNT(*) AS count_tx
  FROM public.transactions
  WHERE type = 'expense'
    AND card_id IS NULL -- ✅ APENAS CAIXA
  GROUP BY user_id, year_month, category_id
),
actual_totals AS (
  -- Gasto total por usuário e mês (soma de todas as categorias)
  SELECT
    user_id,
    year_month,
    SUM(actual_cents) AS total_actual_cents,
    SUM(count_tx) AS total_count_tx
  FROM actual_cash
  GROUP BY user_id, year_month
)
SELECT
  COALESCE(b.user_id, a.user_id) AS user_id,
  COALESCE(b.year_month, a.year_month) AS year_month,
  a.category_id,
  
  -- Orçamento (total do mês, não por categoria)
  COALESCE(b.budget_cents, 0)::bigint AS budget_cents,
  
  -- Realizado (por categoria)
  COALESCE(a.actual_cents, 0)::bigint AS actual_cents,
  COALESCE(a.count_tx, 0)::int AS count_tx,
  
  -- Realizado (total do mês)
  COALESCE(at.total_actual_cents, 0)::bigint AS total_actual_cents,
  COALESCE(at.total_count_tx, 0)::int AS total_count_tx,
  
  -- Desvio (total do mês)
  (COALESCE(at.total_actual_cents, 0) - COALESCE(b.budget_cents, 0))::bigint AS variance_cents,
  
  -- % de Desvio (total do mês)
  CASE
    WHEN b.budget_cents = 0 OR b.budget_cents IS NULL THEN NULL
    ELSE ((COALESCE(at.total_actual_cents, 0)::float / b.budget_cents::float) * 100 - 100)
  END AS variance_pct,
  
  -- % do Orçamento Consumido (total do mês)
  CASE
    WHEN b.budget_cents = 0 OR b.budget_cents IS NULL THEN NULL
    ELSE ((COALESCE(at.total_actual_cents, 0)::float / b.budget_cents::float) * 100)
  END AS consumed_pct
  
FROM budget_totals b
FULL OUTER JOIN actual_cash a 
  ON b.user_id = a.user_id AND b.year_month = a.year_month
LEFT JOIN actual_totals at
  ON COALESCE(b.user_id, a.user_id) = at.user_id 
  AND COALESCE(b.year_month, a.year_month) = at.year_month;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Índices (Performance)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_v_budget_vs_actual_user_month 
  ON public.v_budget_vs_actual (user_id, year_month DESC);

CREATE INDEX idx_v_budget_vs_actual_user_category 
  ON public.v_budget_vs_actual (user_id, category_id, year_month DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Comentários
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON MATERIALIZED VIEW public.v_budget_vs_actual IS 
  'Comparação entre orçamento definido e gasto real (REGIME DE CAIXA) por usuário, mês e categoria.';

COMMENT ON COLUMN public.v_budget_vs_actual.budget_cents IS 
  'Orçamento total do mês definido pelo usuário';

COMMENT ON COLUMN public.v_budget_vs_actual.actual_cents IS 
  'Gasto real da categoria no mês (apenas CAIXA)';

COMMENT ON COLUMN public.v_budget_vs_actual.total_actual_cents IS 
  'Gasto total do mês (soma de todas as categorias)';

COMMENT ON COLUMN public.v_budget_vs_actual.variance_cents IS 
  'Desvio em centavos (total_actual - budget)';

COMMENT ON COLUMN public.v_budget_vs_actual.variance_pct IS 
  'Desvio percentual ((total_actual / budget * 100) - 100)';

COMMENT ON COLUMN public.v_budget_vs_actual.consumed_pct IS 
  'Percentual do orçamento consumido (total_actual / budget * 100)';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Refresh Inicial
-- ────────────────────────────────────────────────────────────────────────────
REFRESH MATERIALIZED VIEW public.v_budget_vs_actual;

-- ============================================================================
-- FIM
-- ============================================================================

