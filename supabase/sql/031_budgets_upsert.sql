-- ============================================================================
-- 031_budgets_upsert.sql - Sistema de Orçamento com Upsert Seguro
-- ============================================================================
-- PROPÓSITO:
-- - Garantir constraint única (user_id, month_key) para orçamentos
-- - Criar RPC upsert_budget seguro com SECURITY DEFINER
-- - Adicionar RLS para proteção de dados
-- - Backfill de dados existentes se necessário
-- ============================================================================

-- 1) Garantir que a tabela existe com estrutura base
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  created_at timestamptz DEFAULT now()
);

-- 2) Adicionar coluna month_key (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'budgets' 
    AND column_name = 'month_key'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN month_key text;
  END IF;
END $$;

-- 3) Backfill do month_key para registros existentes
-- Se houver uma coluna "month" do tipo date:
UPDATE public.budgets
SET month_key = to_char(month, 'YYYY-MM')
WHERE month_key IS NULL AND month IS NOT NULL;

-- Se não houver "month", usa created_at como fallback:
UPDATE public.budgets
SET month_key = to_char(created_at, 'YYYY-MM')
WHERE month_key IS NULL;

-- 4) Tornar month_key obrigatório (depois do backfill)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'budgets' 
    AND column_name = 'month_key'
    AND is_nullable = 'YES'
  ) THEN
    -- Só torna NOT NULL se todos os registros tiverem valor
    IF NOT EXISTS (SELECT 1 FROM public.budgets WHERE month_key IS NULL) THEN
      ALTER TABLE public.budgets ALTER COLUMN month_key SET NOT NULL;
    END IF;
  END IF;
END $$;

-- 5) Adicionar coluna updated_at (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'budgets' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN updated_at timestamptz;
  END IF;
END $$;

-- 6) Criar índice único (necessário para ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_user_month
  ON public.budgets (user_id, month_key);

-- 7) Índice de performance para queries por usuário
CREATE INDEX IF NOT EXISTS idx_budgets_user_id
  ON public.budgets (user_id);

-- 8) Habilitar RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 9) Política RLS: usuário gerencia seus próprios orçamentos
DO $$
BEGIN
  -- Drop política antiga se existir
  DROP POLICY IF EXISTS "Budgets: manage own" ON public.budgets;
  DROP POLICY IF EXISTS "user owns budgets" ON public.budgets;
  
  -- Criar nova política consolidada
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'budgets'
    AND policyname = 'budgets_owner_policy'
  ) THEN
    CREATE POLICY "budgets_owner_policy" ON public.budgets
      FOR ALL 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 10) RPC de upsert seguro (usa auth.uid() automaticamente)
CREATE OR REPLACE FUNCTION public.upsert_budget(
  p_month_key text,
  p_amount_cents bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Obter user_id autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validações
  IF p_month_key IS NULL OR p_month_key = '' THEN
    RAISE EXCEPTION 'month_key is required';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents < 0 THEN
    RAISE EXCEPTION 'amount_cents must be >= 0';
  END IF;

  -- Validar formato YYYY-MM
  IF p_month_key !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'month_key must be in YYYY-MM format';
  END IF;

  -- Upsert
  INSERT INTO public.budgets (
    user_id,
    month_key,
    amount_cents,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_month_key,
    p_amount_cents,
    now(),
    now()
  )
  ON CONFLICT (user_id, month_key)
  DO UPDATE SET
    amount_cents = EXCLUDED.amount_cents,
    updated_at = now()
  RETURNING json_build_object(
    'id', id,
    'user_id', user_id,
    'month_key', month_key,
    'amount_cents', amount_cents,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 11) Permissões do RPC
REVOKE ALL ON FUNCTION public.upsert_budget(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_budget(text, bigint) TO authenticated;

-- 12) Comentários de documentação
COMMENT ON TABLE public.budgets IS 'Orçamentos mensais por usuário';
COMMENT ON COLUMN public.budgets.month_key IS 'Mês no formato YYYY-MM';
COMMENT ON COLUMN public.budgets.amount_cents IS 'Valor do orçamento em centavos';
COMMENT ON FUNCTION public.upsert_budget(text, bigint) IS 'Cria ou atualiza orçamento do usuário autenticado para um mês específico';

-- 13) Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';




