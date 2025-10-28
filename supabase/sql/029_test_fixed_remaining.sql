-- ============================================================================
-- Script de Teste: Verificar Fixas Restantes
-- ============================================================================
-- PROPÓSITO:
-- - Testar se a view pf_fixed_remaining_current_month está funcionando
-- - Verificar se transactions.fixed_id está sendo preenchido corretamente
-- - Validar o fluxo completo de lançamento de fixas
--
-- USO:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique os resultados de cada consulta
-- 3. Crie uma fixa de teste via UI ou SQL
-- 4. Lance a fixa via "Lançar fixas do mês"
-- 5. Execute novamente para ver as mudanças
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Verificar estrutura da tabela transactions (deve ter fixed_id)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions' 
  AND column_name IN ('id', 'fixed_id', 'occurred_at', 'amount_cents')
ORDER BY ordinal_position;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Verificar fixas ativas do usuário
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  id,
  name,
  type,
  amount_cents,
  day_of_month,
  is_active,
  created_at
FROM public.fixed_bills
WHERE user_id = auth.uid()
  AND is_active = true
ORDER BY day_of_month, name;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Verificar view pf_fixed_remaining_current_month
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  start_month,
  end_month,
  fixed_remaining_cents,
  items_remaining
FROM public.pf_fixed_remaining_current_month;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Verificar transações com fixed_id preenchido (mês atual)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  t.id,
  t.occurred_at,
  t.description,
  t.amount_cents,
  t.fixed_id,
  f.name as fixed_name,
  f.day_of_month
FROM public.transactions t
LEFT JOIN public.fixed_bills f ON f.id = t.fixed_id
WHERE t.user_id = auth.uid()
  AND t.occurred_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
  AND t.occurred_at < date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month'
  AND t.fixed_id IS NOT NULL
ORDER BY t.occurred_at DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Verificar quais fixas já foram lançadas vs. restantes
-- ────────────────────────────────────────────────────────────────────────────
WITH launched AS (
  SELECT DISTINCT f.id, f.name, f.day_of_month, f.amount_cents
  FROM public.fixed_bills f
  INNER JOIN public.transactions t ON t.fixed_id = f.id
  WHERE f.user_id = auth.uid()
    AND f.is_active = true
    AND t.occurred_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
    AND t.occurred_at < date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month'
),
remaining AS (
  SELECT f.id, f.name, f.day_of_month, f.amount_cents
  FROM public.fixed_bills f
  WHERE f.user_id = auth.uid()
    AND f.is_active = true
    AND f.day_of_month >= extract(day from now() at time zone 'America/Sao_Paulo')::int
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.fixed_id = f.id
        AND t.occurred_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
        AND t.occurred_at < date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month'
    )
)
SELECT 
  'Lançadas' as status,
  COUNT(*) as quantidade,
  COALESCE(SUM(amount_cents), 0) as total_cents
FROM launched
UNION ALL
SELECT 
  'Restantes' as status,
  COUNT(*) as quantidade,
  COALESCE(SUM(amount_cents), 0) as total_cents
FROM remaining;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Teste: Lançar fixas do mês (descomente para executar)
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT public.launch_fixed_for_month(
--   to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
-- );

-- ────────────────────────────────────────────────────────────────────────────
-- RESULTADOS ESPERADOS:
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Coluna fixed_id deve existir em transactions
-- 2. Fixas ativas devem aparecer na consulta #2
-- 3. View deve mostrar soma > 0 se houver fixas restantes
-- 4. Transações com fixed_id devem aparecer na consulta #4 após lançamento
-- 5. Resumo deve mostrar quantidades corretas de lançadas vs. restantes
-- ────────────────────────────────────────────────────────────────────────────




