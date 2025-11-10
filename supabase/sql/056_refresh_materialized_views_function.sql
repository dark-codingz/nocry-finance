-- ============================================================================
-- 056_refresh_materialized_views_function.sql - Função de Refresh de Views
-- ============================================================================
-- PROPÓSITO:
-- - Criar função para refresh de todas as materialized views de analytics
-- - Facilitar manutenção e atualizações
-- - Pode ser chamada via RPC ou trigger
--
-- USO:
-- SELECT refresh_analytics_views();
--
-- IMPORTANTE:
-- - Execute após criar/modificar transações, faturas, orçamentos
-- - Pode ser agendada via cron (pg_cron) ou trigger
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Drop se existir (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.refresh_analytics_views() CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Criar Função
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS TABLE (
  view_name text,
  refreshed_at timestamptz,
  duration_ms int
) AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
BEGIN
  -- ──────────────────────────────────────────────────────────────────────
  -- 1. v_cash_movements_monthly
  -- ──────────────────────────────────────────────────────────────────────
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_cash_movements_monthly;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'v_cash_movements_monthly'::text,
    end_time,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::int;
  
  -- ──────────────────────────────────────────────────────────────────────
  -- 2. v_charges_monthly
  -- ──────────────────────────────────────────────────────────────────────
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_charges_monthly;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'v_charges_monthly'::text,
    end_time,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::int;
  
  -- ──────────────────────────────────────────────────────────────────────
  -- 3. v_budget_vs_actual
  -- ──────────────────────────────────────────────────────────────────────
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_budget_vs_actual;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'v_budget_vs_actual'::text,
    end_time,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::int;
  
  -- ──────────────────────────────────────────────────────────────────────
  -- 4. v_kpis_core
  -- ──────────────────────────────────────────────────────────────────────
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_kpis_core;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'v_kpis_core'::text,
    end_time,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::int;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Comentário
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.refresh_analytics_views() IS 
  'Atualiza todas as materialized views de analytics e retorna tempo de execução.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Grant para usuários autenticados
-- ────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views() TO authenticated;

-- ============================================================================
-- EXEMPLO DE USO:
-- ============================================================================
-- SELECT * FROM refresh_analytics_views();
--
-- Retorno esperado:
-- | view_name                   | refreshed_at              | duration_ms |
-- |-----------------------------|---------------------------|-------------|
-- | v_cash_movements_monthly    | 2025-01-11 10:30:45.123   | 245         |
-- | v_charges_monthly           | 2025-01-11 10:30:45.368   | 189         |
-- | v_budget_vs_actual          | 2025-01-11 10:30:45.557   | 156         |
-- | v_kpis_core                 | 2025-01-11 10:30:45.713   | 203         |
-- ============================================================================

-- ============================================================================
-- FIM
-- ============================================================================

