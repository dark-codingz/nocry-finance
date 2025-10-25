-- ============================================================================
-- 999_diag_rpcs.sql - Diagnóstico de RPCs
-- ============================================================================
-- PROPÓSITO:
-- - Validar que as RPCs estão com assinatura JSON correta
-- - Verificar schema cache
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Listar assinaturas das RPCs críticas
-- ────────────────────────────────────────────────────────────────────────────
select 
  n.nspname as schema, 
  p.proname as name, 
  oidvectortypes(p.proargtypes) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('pf_net_by_period','create_card_installments')
order by p.proname;

-- ────────────────────────────────────────────────────────────────────────────
-- Resultado esperado:
-- ────────────────────────────────────────────────────────────────────────────
-- | schema | name                        | args   |
-- |--------|-----------------------------|--------|
-- | public | create_card_installments    | jsonb  |
-- | public | pf_net_by_period            | jsonb  |
-- ────────────────────────────────────────────────────────────────────────────



