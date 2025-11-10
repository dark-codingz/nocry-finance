-- ============================================================================
-- 050_v_cash_movements_monthly.sql - Materialized View: Movimentos de Caixa Mensais
-- ============================================================================
-- PROPÓSITO:
-- - Agregar CAIXA (IN/OUT) por mês, conta, categoria
-- - Performance: Materialized para queries rápidas em analytics
-- - Usado em: Flow, Categorias, Drill-down
--
-- FÓRMULA:
-- - Apenas transações com card_id IS NULL (dinheiro REAL)
-- - Agregação por user_id, year_month, account_id, category_id, type
--
-- REFRESH:
-- - Manual via REFRESH MATERIALIZED VIEW
-- - Automático via trigger em transactions (futuro)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.v_cash_movements_monthly CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar Materialized View
-- ────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.v_cash_movements_monthly AS
SELECT
  t.user_id,
  TO_CHAR(t.occurred_at, 'YYYY-MM') AS year_month,
  t.account_id,
  t.category_id,
  t.type, -- 'income' ou 'expense'
  
  -- Agregações
  COUNT(*) AS count_tx,
  SUM(t.amount_cents) AS total_cents,
  AVG(t.amount_cents)::bigint AS avg_ticket_cents,
  MIN(t.amount_cents) AS min_cents,
  MAX(t.amount_cents) AS max_cents,
  
  -- Metadata
  MIN(t.occurred_at) AS first_date,
  MAX(t.occurred_at) AS last_date
  
FROM public.transactions t
WHERE t.card_id IS NULL -- ✅ APENAS CAIXA (sem compras de cartão)
  AND t.type IN ('income', 'expense') -- Ignora transfers
GROUP BY 
  t.user_id,
  year_month,
  t.account_id,
  t.category_id,
  t.type;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Índices (Performance)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_v_cash_movements_monthly_user_month 
  ON public.v_cash_movements_monthly (user_id, year_month DESC);

CREATE INDEX idx_v_cash_movements_monthly_user_category 
  ON public.v_cash_movements_monthly (user_id, category_id, year_month DESC);

CREATE INDEX idx_v_cash_movements_monthly_user_account 
  ON public.v_cash_movements_monthly (user_id, account_id, year_month DESC);

CREATE INDEX idx_v_cash_movements_monthly_user_type 
  ON public.v_cash_movements_monthly (user_id, type, year_month DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Comentários
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON MATERIALIZED VIEW public.v_cash_movements_monthly IS 
  'Agregação mensal de movimentos de CAIXA (card_id IS NULL) por usuário, conta e categoria.';

COMMENT ON COLUMN public.v_cash_movements_monthly.year_month IS 
  'Mês no formato YYYY-MM';

COMMENT ON COLUMN public.v_cash_movements_monthly.count_tx IS 
  'Quantidade de transações no período';

COMMENT ON COLUMN public.v_cash_movements_monthly.total_cents IS 
  'Soma dos valores em centavos';

COMMENT ON COLUMN public.v_cash_movements_monthly.avg_ticket_cents IS 
  'Ticket médio em centavos';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Refresh Inicial
-- ────────────────────────────────────────────────────────────────────────────
REFRESH MATERIALIZED VIEW public.v_cash_movements_monthly;

-- ============================================================================
-- FIM
-- ============================================================================

