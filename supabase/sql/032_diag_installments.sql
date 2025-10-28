-- ============================================================================
-- 032_diag_installments.sql - Diagnóstico de Funções RPC
-- ============================================================================
-- PROPÓSITO:
-- - Verificar se a função create_card_installments existe
-- - Mostrar todas as assinaturas (overloads) existentes
-- - Identificar problemas de tipo
-- ============================================================================

-- Listar todas as funções chamadas create_card_installments e suas assinaturas
select
  n.nspname as schema,
  p.proname as name,
  oidvectortypes(p.proargtypes) as argtypes,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'create_card_installments'
order by n.nspname, p.proname;

-- Se não retornar nada, a função não existe nessa instância do Supabase




