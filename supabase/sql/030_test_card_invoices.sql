-- ============================================================================
-- Script de Teste: Verificar Faturas de Cartão
-- ============================================================================
-- PROPÓSITO:
-- - Testar se a view pf_card_invoices_due_this_month está funcionando
-- - Verificar se due_dates estão sendo calculadas corretamente
-- - Diagnosticar por que a soma pode estar 0
--
-- USO:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique os resultados de cada consulta
-- 3. Ajuste closing_day/due_day dos cartões se necessário
-- 4. Crie compras de teste para validar o cálculo
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Verificar cartões do usuário (closing_day e due_day)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  id,
  name,
  closing_day,
  due_day,
  limit_cents,
  created_at
FROM public.cards
WHERE user_id = auth.uid()
ORDER BY name;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Verificar compras de cartão (mês atual)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  t.id,
  t.occurred_at,
  t.description,
  t.amount_cents,
  t.card_id,
  c.name as card_name
FROM public.transactions t
INNER JOIN public.cards c ON c.id = t.card_id
WHERE t.user_id = auth.uid()
  AND t.type = 'expense'
  AND t.card_id IS NOT NULL
  AND t.occurred_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
  AND t.occurred_at < date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month'
ORDER BY t.occurred_at DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Verificar view card_invoices_current (faturas atuais)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  card_id,
  card_name,
  amount_cents,
  due_date,
  days_to_due,
  cycle_start,
  cycle_end
FROM public.card_invoices_current
ORDER BY due_date;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Verificar view pf_card_invoices_due_this_month (soma filtrada)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  start_month,
  end_month,
  invoices_due_this_month_cents
FROM public.pf_card_invoices_due_this_month;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Diagnóstico: Por que a soma pode estar 0?
-- ────────────────────────────────────────────────────────────────────────────
WITH current_month AS (
  SELECT 
    date_trunc('month', now() at time zone 'America/Sao_Paulo')::date as start_month,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month - 1 day')::date as end_month
)
SELECT 
  ci.card_name,
  ci.amount_cents,
  ci.due_date,
  CASE 
    WHEN ci.due_date BETWEEN cm.start_month AND cm.end_month THEN 'Vence ESTE mês (será somada)'
    WHEN ci.due_date > cm.end_month THEN 'Vence PRÓXIMO mês (NÃO será somada)'
    ELSE 'Vence mês PASSADO (NÃO será somada)'
  END as status,
  cm.start_month,
  cm.end_month
FROM public.card_invoices_current ci
CROSS JOIN current_month cm
ORDER BY ci.due_date;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Simulação: Criar cartão de teste com vencimento no mês atual
-- ────────────────────────────────────────────────────────────────────────────
-- DESCOMENTE PARA CRIAR UM CARTÃO DE TESTE:
/*
INSERT INTO public.cards (
  user_id, 
  name, 
  closing_day, 
  due_day, 
  limit_cents
) VALUES (
  auth.uid(),
  'Cartão Teste',
  5,   -- Fecha dia 5
  15,  -- Vence dia 15 (mesmo mês)
  500000  -- R$ 5.000,00 de limite
);
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Simulação: Criar compra de teste no cartão
-- ────────────────────────────────────────────────────────────────────────────
-- DESCOMENTE PARA CRIAR UMA COMPRA DE TESTE:
/*
INSERT INTO public.transactions (
  user_id,
  type,
  amount_cents,
  occurred_at,
  description,
  card_id,
  category_id
) VALUES (
  auth.uid(),
  'expense',
  15000,  -- R$ 150,00
  (now() at time zone 'America/Sao_Paulo')::date,
  'Compra Teste',
  '...', -- UUID do cartão (pegar da consulta #1)
  '...'  -- UUID da categoria (opcional)
);
*/

-- ────────────────────────────────────────────────────────────────────────────
-- RESULTADOS ESPERADOS:
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Cartões devem aparecer com closing_day e due_day configurados
-- 2. Compras devem aparecer vinculadas ao cartão (card_id não null)
-- 3. View card_invoices_current deve mostrar faturas com due_date calculada
-- 4. View pf_card_invoices_due_this_month:
--    - Retorna > 0 se houver faturas com due_date NESTE mês
--    - Retorna 0 se todas as faturas vencerem no PRÓXIMO mês
-- 5. Diagnóstico mostra status de cada fatura (vence este mês ou não)
--
-- TROUBLESHOOTING:
-- - Se soma = 0 mas há compras: due_date provavelmente está no próximo mês
-- - Se nenhuma fatura aparece: não há compras de cartão ou cartão sem closing_day
-- - Se due_date está errada: revisar lógica de cálculo em card_invoices_current
-- ────────────────────────────────────────────────────────────────────────────




