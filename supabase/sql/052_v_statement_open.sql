-- ============================================================================
-- 052_v_statement_open.sql - View: Saldo Aberto por Cartão
-- ============================================================================
-- PROPÓSITO:
-- - Calcular saldo aberto de cada cartão (charges - payments)
-- - NÃO É MATERIALIZED (sempre atual)
-- - Usado em: Gauge de Crédito, KPIs de Utilização
--
-- FÓRMULA:
-- - charges = SUM(transactions WHERE card_id = X AND type = 'expense')
-- - payments = SUM(invoice_payments WHERE card_id = X)
-- - open_amount = charges - payments
--
-- IMPORTANTE:
-- - Esta view NÃO considera ciclo de faturamento (soma TUDO desde sempre)
-- - Para fatura ATUAL do ciclo, use card_invoices_with_payments
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_statement_open CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar View
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_statement_open AS
WITH card_charges AS (
  -- Total de compras por cartão (desde sempre)
  SELECT
    t.card_id,
    SUM(t.amount_cents) AS total_charges_cents,
    COUNT(*) AS count_charges
  FROM public.transactions t
  WHERE t.card_id IS NOT NULL
    AND t.type = 'expense'
  GROUP BY t.card_id
),
card_payments AS (
  -- Total de pagamentos por cartão (desde sempre)
  SELECT
    p.card_id,
    SUM(p.amount_cents) AS total_payments_cents,
    COUNT(*) AS count_payments
  FROM public.invoice_payments p
  GROUP BY p.card_id
)
SELECT
  c.id AS card_id,
  c.user_id,
  c.name AS card_name,
  c.limit_cents,
  
  -- Totais
  COALESCE(ch.total_charges_cents, 0)::bigint AS total_charges_cents,
  COALESCE(ch.count_charges, 0)::int AS count_charges,
  COALESCE(p.total_payments_cents, 0)::bigint AS total_payments_cents,
  COALESCE(p.count_payments, 0)::int AS count_payments,
  
  -- Saldo Aberto (charges - payments)
  (COALESCE(ch.total_charges_cents, 0) - COALESCE(p.total_payments_cents, 0))::bigint AS open_amount_cents,
  
  -- Utilização de Crédito (%)
  CASE
    WHEN c.limit_cents = 0 THEN 0
    ELSE ((COALESCE(ch.total_charges_cents, 0) - COALESCE(p.total_payments_cents, 0))::float / c.limit_cents::float * 100)
  END AS utilization_pct,
  
  -- Limite Disponível
  (c.limit_cents - (COALESCE(ch.total_charges_cents, 0) - COALESCE(p.total_payments_cents, 0)))::bigint AS available_limit_cents
  
FROM public.cards c
LEFT JOIN card_charges ch ON ch.card_id = c.id
LEFT JOIN card_payments p ON p.card_id = c.id
WHERE c.user_id = auth.uid(); -- RLS

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Comentários
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON VIEW public.v_statement_open IS 
  'Saldo aberto por cartão (charges - payments) desde o início, sem considerar ciclo de faturamento.';

COMMENT ON COLUMN public.v_statement_open.open_amount_cents IS 
  'Saldo aberto em centavos (charges - payments)';

COMMENT ON COLUMN public.v_statement_open.utilization_pct IS 
  'Percentual de utilização do limite (open_amount / limit * 100)';

COMMENT ON COLUMN public.v_statement_open.available_limit_cents IS 
  'Limite disponível em centavos (limit - open_amount)';

-- ============================================================================
-- FIM
-- ============================================================================

