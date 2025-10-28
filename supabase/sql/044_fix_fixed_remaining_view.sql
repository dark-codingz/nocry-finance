-- ============================================================================
-- Migration: 044_fix_fixed_remaining_view
-- ============================================================================
-- PROPÓSITO:
-- - Corrigir a VIEW pf_fixed_remaining_current_month
-- - PROBLEMA: A VIEW antiga filtrava day_of_month >= today_day
-- - IMPACTO: Fixas dos dias anteriores no mês não apareciam como restantes
--
-- EXEMPLO DO BUG:
-- - Se hoje é dia 28
-- - VIEW antiga só pegava fixas com dia 28, 29, 30, 31
-- - Fixas dos dias 1-27 que NÃO foram lançadas sumiam do cálculo! 😱
--
-- SOLUÇÃO:
-- - Pegar TODAS as fixas ativas do mês (sem filtro de dia)
-- - Verificar quais já foram lançadas (via transactions.fixed_id)
-- - Somar apenas as que NÃO foram lançadas ainda
--
-- LÓGICA CORRETA:
-- 1. Busca TODAS as fixas ativas do usuário (type = 'expense')
-- 2. LEFT JOIN com transactions.fixed_id no mês atual
-- 3. Filtra onde transactions.id IS NULL (ainda não lançada)
-- 4. Soma amount_cents das fixas não lançadas
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- View: pf_fixed_remaining_current_month (CORRIGIDA)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.pf_fixed_remaining_current_month AS
WITH vars AS (
  -- Data de hoje no timezone Brasil
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE AS today
),
bounds AS (
  -- Define o período do mês atual
  SELECT
    DATE_TRUNC('month', v.today)::DATE AS start_month,
    (DATE_TRUNC('month', v.today) + INTERVAL '1 month - 1 day')::DATE AS end_month
  FROM vars v
),
all_fixed AS (
  -- ✅ CORRIGIDO: Pega TODAS as fixas ativas (sem filtro de dia)
  -- Motivo: Se uma fixa não foi lançada, ela deve aparecer como "restante"
  -- independente de já ter passado o dia no mês
  SELECT f.*
  FROM public.fixed_bills f
  WHERE f.user_id = auth.uid()
    AND f.is_active IS TRUE
    AND f.type = 'expense'
),
launched AS (
  -- Busca quais fixas JÁ foram lançadas no mês atual (via fixed_id)
  SELECT DISTINCT t.fixed_id
  FROM public.transactions t, bounds b
  WHERE t.user_id = auth.uid()
    AND t.fixed_id IS NOT NULL
    AND t.occurred_at BETWEEN b.start_month AND b.end_month
)
SELECT
  b.start_month,
  b.end_month,
  -- ✅ Soma apenas fixas que NÃO foram lançadas (launched.fixed_id IS NULL)
  COALESCE(SUM(
    CASE 
      WHEN l.fixed_id IS NULL THEN f.amount_cents 
      ELSE 0 
    END
  ), 0)::BIGINT AS fixed_remaining_cents,
  -- ✅ Conta apenas fixas que NÃO foram lançadas
  COALESCE(SUM(
    CASE 
      WHEN l.fixed_id IS NULL THEN 1 
      ELSE 0 
    END
  ), 0)::INT AS items_remaining
FROM bounds b
CROSS JOIN all_fixed f
LEFT JOIN launched l ON l.fixed_id = f.id
GROUP BY b.start_month, b.end_month;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON VIEW public.pf_fixed_remaining_current_month IS
  'Soma das despesas fixas ativas que ainda NÃO foram lançadas no mês atual (verificado via transactions.fixed_id). CORRIGIDO: não filtra mais por day_of_month >= hoje.';

COMMENT ON COLUMN public.pf_fixed_remaining_current_month.start_month IS
  'Primeiro dia do mês atual';

COMMENT ON COLUMN public.pf_fixed_remaining_current_month.end_month IS
  'Último dia do mês atual';

COMMENT ON COLUMN public.pf_fixed_remaining_current_month.fixed_remaining_cents IS
  'Soma dos valores das fixas ativas que NÃO foram lançadas ainda (em centavos)';

COMMENT ON COLUMN public.pf_fixed_remaining_current_month.items_remaining IS
  'Quantidade de fixas ativas que NÃO foram lançadas ainda';

-- ────────────────────────────────────────────────────────────────────────────
-- EXEMPLO DE USO:
-- ────────────────────────────────────────────────────────────────────────────
-- Cenário:
-- - Usuário tem 3 fixas ativas:
--   1. Netflix (R$ 50,00) - Dia 10 - JÁ LANÇADA
--   2. Luz (R$ 200,00) - Dia 15 - NÃO LANÇADA
--   3. Água (R$ 80,00) - Dia 20 - NÃO LANÇADA
-- - Hoje é dia 28
--
-- VIEW ANTIGA (BUGADA):
-- - Pegava apenas fixas com dia >= 28 (NENHUMA!)
-- - fixed_remaining_cents = R$ 0,00 ❌
--
-- VIEW NOVA (CORRIGIDA):
-- - Pega TODAS as fixas ativas
-- - Exclui Netflix (já lançada via fixed_id)
-- - Soma Luz + Água = R$ 280,00 ✅
-- - fixed_remaining_cents = R$ 280,00 ✅
-- - items_remaining = 2 ✅
-- ────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════

