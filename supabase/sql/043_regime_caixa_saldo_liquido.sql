-- ============================================================================
-- 043_regime_caixa_saldo_liquido.sql - Saldo Líquido em Regime de Caixa
-- ============================================================================
-- PROPÓSITO:
-- - Modificar cálculo do Saldo Líquido para regime de caixa (cash basis)
-- - NÃO abater compras de cartão de crédito até a fatura ser paga
-- - Compras de cartão (card_id NOT NULL) são excluídas do total de despesas
-- - Pagamento de faturas (quando ocorrer) será lançado como despesa normal
-- 
-- ANTES:
-- - Saldo Líquido = Receitas - TODAS as Despesas (incluindo cartão)
-- - Duplicava a despesa (no ato da compra + no pagamento da fatura)
--
-- DEPOIS:
-- - Saldo Líquido = Receitas - Despesas SEM CARTÃO
-- - Compras de cartão ficam no card "Fatura Atual" separadamente
-- - Só abate do saldo quando a fatura for paga (despesa sem card_id)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Atualizar RPC: pf_net_by_period (Regime de Caixa)
-- ────────────────────────────────────────────────────────────────────────────
-- IMPORTANTE: DROP da função antiga antes de recriar (evita erro "not unique")
DROP FUNCTION IF EXISTS public.pf_net_by_period(DATE, DATE);

CREATE OR REPLACE FUNCTION public.pf_net_by_period(
  p_date_from DATE,
  p_date_to   DATE
)
RETURNS TABLE (
  total_income_cents  BIGINT,
  total_expense_cents BIGINT,
  net_cents           BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH tx AS (
    SELECT
      SUM(CASE WHEN type = 'income'  THEN amount_cents ELSE 0 END)::BIGINT AS inc,
      -- REGIME DE CAIXA: Excluir despesas de cartão (card_id IS NOT NULL)
      SUM(CASE 
        WHEN type = 'expense' AND card_id IS NULL THEN amount_cents 
        ELSE 0 
      END)::BIGINT AS exp
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND type IN ('income','expense')   -- ignora 'transfer'
      AND occurred_at >= p_date_from
      AND occurred_at <= p_date_to
  )
  SELECT
    COALESCE(inc, 0)  AS total_income_cents,
    COALESCE(exp, 0)  AS total_expense_cents,
    COALESCE(inc, 0) - COALESCE(exp, 0) AS net_cents
  FROM tx;
$$;

COMMENT ON FUNCTION public.pf_net_by_period IS 
  'Calcula saldo líquido em REGIME DE CAIXA: exclui compras de cartão (card_id NOT NULL) para não duplicar despesas. Só abate quando a fatura for paga.';

-- ════════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: NÃO MEXER NA VIEW pf_month_summary!
-- ════════════════════════════════════════════════════════════════════════════
-- Motivo: A view pf_month_summary é usada por outros cards (SDM Projetado).
-- Mexer nela afetaria múltiplos componentes.
-- 
-- A função pf_net_by_period() acima é usada APENAS pelo card "Saldo Líquido".
-- Isso garante que só esse card opera em regime de caixa.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════

