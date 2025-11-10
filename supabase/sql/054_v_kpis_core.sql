-- ============================================================================
-- 054_v_kpis_core.sql - Materialized View: KPIs Pré-calculados
-- ============================================================================
-- PROPÓSITO:
-- - Pré-calcular KPIs principais por usuário e mês
-- - Savings Ratio, Burn Rate, Net, etc.
-- - Usado em: Painel de KPIs, Alertas
--
-- FÓRMULAS:
-- - income_cents = SUM(transactions WHERE type='income' AND card_id IS NULL)
-- - expense_cents = SUM(transactions WHERE type='expense' AND card_id IS NULL)
-- - net_cents = income - expense
-- - savings_ratio_pct = (net / income * 100) [simplificado, sem investimentos]
-- - burn_rate_daily_cents = expense / dias_no_mês
--
-- IMPORTANTE:
-- - Apenas CAIXA (card_id IS NULL)
-- - Savings Ratio simplificado (sem categoria "Investimentos" por enquanto)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.v_kpis_core CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar Materialized View
-- ────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.v_kpis_core AS
WITH monthly_data AS (
  SELECT
    user_id,
    TO_CHAR(occurred_at, 'YYYY-MM') AS year_month,
    DATE_TRUNC('month', occurred_at)::date AS month_start,
    
    -- Receitas e Despesas (CAIXA)
    SUM(CASE WHEN type = 'income' AND card_id IS NULL THEN amount_cents ELSE 0 END) AS income_cents,
    SUM(CASE WHEN type = 'expense' AND card_id IS NULL THEN amount_cents ELSE 0 END) AS expense_cents,
    
    -- Contadores
    COUNT(CASE WHEN type = 'income' AND card_id IS NULL THEN 1 END) AS income_count,
    COUNT(CASE WHEN type = 'expense' AND card_id IS NULL THEN 1 END) AS expense_count
    
  FROM public.transactions
  WHERE type IN ('income', 'expense')
  GROUP BY user_id, year_month, month_start
)
SELECT
  user_id,
  year_month,
  month_start,
  
  -- Totais
  income_cents,
  expense_cents,
  (income_cents - expense_cents)::bigint AS net_cents,
  
  -- Contadores
  income_count,
  expense_count,
  
  -- Tickets Médios
  CASE
    WHEN income_count = 0 THEN 0
    ELSE (income_cents::float / income_count::float)::bigint
  END AS avg_income_cents,
  CASE
    WHEN expense_count = 0 THEN 0
    ELSE (expense_cents::float / expense_count::float)::bigint
  END AS avg_expense_cents,
  
  -- Savings Ratio (simplificado: net / income * 100)
  CASE
    WHEN income_cents = 0 THEN 0
    ELSE ((income_cents - expense_cents)::float / income_cents::float * 100)
  END AS savings_ratio_pct,
  
  -- Burn Rate (gasto diário médio)
  (expense_cents::float / EXTRACT(DAY FROM (month_start + INTERVAL '1 month' - INTERVAL '1 day')::date)::float)::bigint AS burn_rate_daily_cents,
  
  -- Dias no mês
  EXTRACT(DAY FROM (month_start + INTERVAL '1 month' - INTERVAL '1 day')::date)::int AS days_in_month
  
FROM monthly_data;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Índices (Performance)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_v_kpis_core_user_month 
  ON public.v_kpis_core (user_id, year_month DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Comentários
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON MATERIALIZED VIEW public.v_kpis_core IS 
  'KPIs pré-calculados por usuário e mês (REGIME DE CAIXA).';

COMMENT ON COLUMN public.v_kpis_core.income_cents IS 
  'Total de receitas (CAIXA) em centavos';

COMMENT ON COLUMN public.v_kpis_core.expense_cents IS 
  'Total de despesas (CAIXA) em centavos';

COMMENT ON COLUMN public.v_kpis_core.net_cents IS 
  'Saldo líquido (income - expense)';

COMMENT ON COLUMN public.v_kpis_core.savings_ratio_pct IS 
  'Taxa de poupança simplificada ((income - expense) / income * 100)';

COMMENT ON COLUMN public.v_kpis_core.burn_rate_daily_cents IS 
  'Taxa de queima diária (expense / dias_no_mês)';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Refresh Inicial
-- ────────────────────────────────────────────────────────────────────────────
REFRESH MATERIALIZED VIEW public.v_kpis_core;

-- ============================================================================
-- FIM
-- ============================================================================

