-- ============================================================================
-- 046_card_invoices_with_payments.sql - View de Faturas com Pagamentos
-- ============================================================================
-- PROPÓSITO:
-- - Criar view que calcula saldo aberto de cada fatura (charges - payments)
-- - Mostrar total de compras, total de pagamentos e saldo pendente
-- - Usado para exibir fatura atual com pagamentos já efetuados
--
-- FÓRMULA:
-- balance_cents = total_charges_cents - total_payments_cents
--
-- NOTA: Esta view complementa card_invoices_current, adicionando info de pagamentos
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Criar view card_invoices_with_payments
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.card_invoices_with_payments AS
WITH 
-- Passo 1: Obter faturas atuais (cycles e período)
vars AS (
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS today
),
cycles AS (
  SELECT
    c.id AS card_id,
    c.name AS card_name,
    c.user_id,
    c.closing_day,
    c.due_day,
    v.today,
    make_date(
      EXTRACT(year FROM v.today)::int,
      EXTRACT(month FROM v.today)::int,
      c.closing_day
    ) AS current_month_closing_date
  FROM public.cards c
  CROSS JOIN vars v
  WHERE c.user_id = auth.uid()
),
invoice_period AS (
  SELECT
    card_id,
    card_name,
    user_id,
    closing_day,
    due_day,
    today,
    CASE
      WHEN today > current_month_closing_date
        THEN (current_month_closing_date + INTERVAL '1 day')::date
      ELSE (current_month_closing_date - INTERVAL '1 month' + INTERVAL '1 day')::date
    END AS cycle_start,
    CASE
      WHEN today > current_month_closing_date
        THEN (current_month_closing_date + INTERVAL '1 month')::date
      ELSE current_month_closing_date
    END AS cycle_end
  FROM cycles
),
calc AS (
  SELECT
    p.*,
    -- Regra de vencimento
    CASE
      WHEN p.due_day >= p.closing_day THEN
        make_date(
          EXTRACT(year FROM p.cycle_end)::int,
          EXTRACT(month FROM p.cycle_end)::int,
          p.due_day
        )
      ELSE
        (date_trunc('month', p.cycle_end) + INTERVAL '1 month')::date
        + (p.due_day - 1) * INTERVAL '1 day'
    END::date AS due_date
  FROM invoice_period p
),
-- Passo 2: Calcular total de compras (charges) do ciclo atual
charges AS (
  SELECT
    c.card_id,
    c.card_name,
    c.user_id,
    c.cycle_start,
    c.cycle_end,
    c.due_date,
    c.today,
    COALESCE(SUM(t.amount_cents), 0)::bigint AS total_charges_cents
  FROM calc c
  LEFT JOIN public.transactions t
    ON t.card_id = c.card_id
   AND t.type = 'expense'
   AND t.occurred_at BETWEEN c.cycle_start AND c.cycle_end
  GROUP BY 
    c.card_id, c.card_name, c.user_id, 
    c.cycle_start, c.cycle_end, c.due_date, c.today
),
-- Passo 3: Calcular total de pagamentos do ciclo atual
payments AS (
  SELECT
    c.card_id,
    COALESCE(SUM(p.amount_cents), 0)::bigint AS total_payments_cents
  FROM calc c
  LEFT JOIN public.invoice_payments p
    ON p.card_id = c.card_id
   AND p.paid_at BETWEEN c.cycle_start AND c.due_date
  GROUP BY c.card_id
)
-- Passo 4: Combinar charges e payments
SELECT
  ch.card_id,
  ch.card_name,
  ch.cycle_start,
  ch.cycle_end,
  ch.due_date,
  (ch.due_date - ch.today) AS days_to_due,
  ch.total_charges_cents,
  COALESCE(p.total_payments_cents, 0)::bigint AS total_payments_cents,
  (ch.total_charges_cents - COALESCE(p.total_payments_cents, 0))::bigint AS balance_cents
FROM charges ch
LEFT JOIN payments p ON p.card_id = ch.card_id;

COMMENT ON VIEW public.card_invoices_with_payments IS 
  'Faturas atuais com info de pagamentos (charges - payments = balance).';

-- ============================================================================
-- FIM
-- ============================================================================

