-- ============================================================================
-- 051_v_charges_monthly.sql - Materialized View: Compras de Cartão Mensais (Competência)
-- ============================================================================
-- PROPÓSITO:
-- - Agregar COMPETÊNCIA (compras de cartão) por mês, cartão, categoria
-- - Performance: Materialized para queries rápidas em analytics
-- - Usado em: Toggle Competência, Crédito, Drill-down
--
-- FÓRMULA:
-- - Apenas transações com card_id IS NOT NULL (compras no crédito)
-- - Agregação por user_id, statement_month, card_id, category_id
--
-- REFRESH:
-- - Manual via REFRESH MATERIALIZED VIEW
-- - Automático via trigger em transactions (futuro)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.v_charges_monthly CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar Materialized View
-- ────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.v_charges_monthly AS
SELECT
  t.user_id,
  t.card_id,
  t.category_id,
  TO_CHAR(t.occurred_at, 'YYYY-MM') AS statement_month,
  
  -- Agregações
  COUNT(*) AS count_charges,
  SUM(t.amount_cents) AS charges_total_cents,
  AVG(t.amount_cents)::bigint AS avg_ticket_cents,
  MIN(t.amount_cents) AS min_cents,
  MAX(t.amount_cents) AS max_cents,
  
  -- Parcelamento
  COUNT(CASE WHEN t.installment_total > 1 THEN 1 END) AS count_installments,
  SUM(CASE WHEN t.installment_total > 1 THEN t.amount_cents ELSE 0 END) AS installments_total_cents,
  
  -- Metadata
  MIN(t.occurred_at) AS first_date,
  MAX(t.occurred_at) AS last_date
  
FROM public.transactions t
WHERE t.card_id IS NOT NULL -- ✅ APENAS COMPETÊNCIA (compras de cartão)
  AND t.type = 'expense' -- Compras são sempre 'expense'
GROUP BY 
  t.user_id,
  t.card_id,
  t.category_id,
  statement_month;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Índices (Performance)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_v_charges_monthly_user_month 
  ON public.v_charges_monthly (user_id, statement_month DESC);

CREATE INDEX idx_v_charges_monthly_user_card 
  ON public.v_charges_monthly (user_id, card_id, statement_month DESC);

CREATE INDEX idx_v_charges_monthly_user_category 
  ON public.v_charges_monthly (user_id, category_id, statement_month DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Comentários
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON MATERIALIZED VIEW public.v_charges_monthly IS 
  'Agregação mensal de compras de CARTÃO (competência) por usuário, cartão e categoria.';

COMMENT ON COLUMN public.v_charges_monthly.statement_month IS 
  'Mês da compra no formato YYYY-MM (ciclo de faturamento)';

COMMENT ON COLUMN public.v_charges_monthly.count_charges IS 
  'Quantidade de compras no período';

COMMENT ON COLUMN public.v_charges_monthly.charges_total_cents IS 
  'Soma dos valores em centavos';

COMMENT ON COLUMN public.v_charges_monthly.avg_ticket_cents IS 
  'Ticket médio em centavos';

COMMENT ON COLUMN public.v_charges_monthly.count_installments IS 
  'Quantidade de compras parceladas';

COMMENT ON COLUMN public.v_charges_monthly.installments_total_cents IS 
  'Soma dos valores parcelados';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Refresh Inicial
-- ────────────────────────────────────────────────────────────────────────────
REFRESH MATERIALIZED VIEW public.v_charges_monthly;

-- ============================================================================
-- FIM
-- ============================================================================

