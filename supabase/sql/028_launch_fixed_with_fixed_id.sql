-- ============================================================================
-- Migration: 028_launch_fixed_with_fixed_id
-- ============================================================================
-- PROPÓSITO:
-- - Criar/atualizar função RPC para lançar fixas do mês
-- - GARANTIR que transactions.fixed_id seja preenchido ao criar transação
-- - Permitir identificação de fixas já lançadas (evitar duplicatas)
--
-- IMPORTANTE:
-- Esta função é IDEMPOTENTE: não cria duplicatas se a fixa já foi lançada
-- no mês (verifica via transactions.fixed_id).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Função: launch_fixed_for_month
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.launch_fixed_for_month(p_month text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_year int;
  v_month int;
  v_start_date date;
  v_end_date date;
  v_fixed record;
  v_occurred_at date;
  v_count int := 0;
  v_already_launched int := 0;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not authenticated';
  END IF;

  -- Parsear mês (formato: YYYY-MM)
  v_year := substring(p_month from 1 for 4)::int;
  v_month := substring(p_month from 6 for 2)::int;
  
  -- Calcular período do mês
  v_start_date := make_date(v_year, v_month, 1);
  v_end_date := (date_trunc('month', v_start_date) + interval '1 month - 1 day')::date;

  -- Buscar fixas ativas do usuário
  FOR v_fixed IN
    SELECT *
    FROM public.fixed_bills
    WHERE user_id = v_user_id
      AND is_active = true
      AND day_of_month BETWEEN 1 AND 28
  LOOP
    -- Calcular data de ocorrência (ano-mês + dia da fixa)
    BEGIN
      v_occurred_at := make_date(v_year, v_month, v_fixed.day_of_month);
    EXCEPTION WHEN OTHERS THEN
      -- Se o dia não existir no mês (ex: 30 em fevereiro), pular
      CONTINUE;
    END;

    -- Verificar se já foi lançada neste mês (via fixed_id)
    IF EXISTS (
      SELECT 1
      FROM public.transactions
      WHERE user_id = v_user_id
        AND fixed_id = v_fixed.id
        AND occurred_at BETWEEN v_start_date AND v_end_date
    ) THEN
      v_already_launched := v_already_launched + 1;
      CONTINUE;
    END IF;

    -- Criar transação com fixed_id preenchido
    INSERT INTO public.transactions (
      user_id,
      type,
      amount_cents,
      occurred_at,
      description,
      account_id,
      card_id,
      category_id,
      fixed_id  -- <<<<<<<<<<<<< IMPORTANTE: vincula à fixa
    ) VALUES (
      v_user_id,
      v_fixed.type,
      v_fixed.amount_cents,
      v_occurred_at,
      v_fixed.name,
      v_fixed.account_id,
      v_fixed.card_id,
      v_fixed.category_id,
      v_fixed.id  -- <<<<<<<<<<<<< IMPORTANTE: ID da fixa
    );

    v_count := v_count + 1;
  END LOOP;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'launched', v_count,
    'already_launched', v_already_launched,
    'total_fixed', v_count + v_already_launched,
    'month', p_month
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentário descritivo
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.launch_fixed_for_month(text) IS
  'Lança contas fixas ativas do mês como transações. Idempotente (não cria duplicatas). Preenche transactions.fixed_id para rastreamento.';

-- ────────────────────────────────────────────────────────────────────────────
-- Permissões: Qualquer usuário autenticado pode executar
-- ────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.launch_fixed_for_month(text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Nota Importante:
-- ────────────────────────────────────────────────────────────────────────────
-- Com fixed_id preenchido, a view pf_fixed_remaining_current_month consegue
-- identificar quais fixas já foram lançadas e excluí-las do cálculo de restantes.
--
-- Fluxo completo:
-- 1. Usuário clica em "Lançar fixas do mês"
-- 2. RPC cria transactions com fixed_id = fixa.id
-- 3. View pf_fixed_remaining_current_month exclui essas fixas da soma
-- 4. Card SDM mostra valor atualizado (menos as fixas já lançadas)
-- ────────────────────────────────────────────────────────────────────────────




