-- ============================================================================
-- Categories RLS Fix - VERSÃO SIMPLIFICADA (SEM TRIGGER)
-- ============================================================================
-- OBJETIVO:
-- - Garantir coluna user_id com DEFAULT auth.uid()
-- - Habilitar RLS
-- - Criar policies CRUD para usuário dono
-- - SEM trigger (confia no DEFAULT + código do cliente)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) REMOVER TRIGGER ANTIGO (se existir)
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_categories_set_user_id ON public.categories;
DROP FUNCTION IF EXISTS public.set_row_user_id();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Garantir coluna user_id
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_data boolean;
  v_first_user_id uuid;
BEGIN
  -- Verificar se a tabela tem dados
  SELECT EXISTS(SELECT 1 FROM public.categories LIMIT 1) INTO v_has_data;
  
  -- Adicionar coluna se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categories' AND column_name='user_id'
  ) THEN
    -- Adicionar coluna como NULLABLE primeiro
    ALTER TABLE public.categories ADD COLUMN user_id uuid;
    RAISE NOTICE '✅ Coluna user_id adicionada (NULLABLE)';
    
    -- Se houver dados existentes, popular com primeiro usuário
    IF v_has_data THEN
      SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
      
      IF v_first_user_id IS NOT NULL THEN
        UPDATE public.categories SET user_id = v_first_user_id WHERE user_id IS NULL;
        RAISE NOTICE '✅ Dados existentes atualizados com user_id: %', v_first_user_id;
      ELSE
        DELETE FROM public.categories WHERE user_id IS NULL;
        RAISE NOTICE '⚠️  Categorias órfãs deletadas (sem usuários)';
      END IF;
    END IF;
    
    -- Tornar NOT NULL e adicionar DEFAULT
    ALTER TABLE public.categories
      ALTER COLUMN user_id SET NOT NULL,
      ALTER COLUMN user_id SET DEFAULT auth.uid();
    
    RAISE NOTICE '✅ user_id agora é NOT NULL com DEFAULT auth.uid()';
  ELSE
    -- Se existe, garantir DEFAULT
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' 
        AND table_name='categories' 
        AND column_name='user_id' 
        AND column_default LIKE '%auth.uid()%'
    ) THEN
      ALTER TABLE public.categories ALTER COLUMN user_id SET DEFAULT auth.uid();
      RAISE NOTICE '✅ DEFAULT auth.uid() adicionado';
    ELSE
      RAISE NOTICE '✅ user_id já configurado corretamente';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) FK em auth.users
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' 
      AND table_name='categories' 
      AND constraint_type='FOREIGN KEY' 
      AND constraint_name='categories_user_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ FK categories_user_id_fkey criada';
  ELSE
    RAISE NOTICE '✅ FK já existe';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Habilitar RLS
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
RAISE NOTICE '✅ RLS habilitado';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Policies CRUD
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_select_own'
  ) THEN
    CREATE POLICY "categories_select_own"
      ON public.categories FOR SELECT
      USING (user_id = auth.uid());
    RAISE NOTICE '✅ Policy SELECT criada';
  ELSE
    RAISE NOTICE '✅ Policy SELECT já existe';
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_insert_own'
  ) THEN
    CREATE POLICY "categories_insert_own"
      ON public.categories FOR INSERT
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE '✅ Policy INSERT criada';
  ELSE
    RAISE NOTICE '✅ Policy INSERT já existe';
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_update_own'
  ) THEN
    CREATE POLICY "categories_update_own"
      ON public.categories FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE '✅ Policy UPDATE criada';
  ELSE
    RAISE NOTICE '✅ Policy UPDATE já existe';
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_delete_own'
  ) THEN
    CREATE POLICY "categories_delete_own"
      ON public.categories FOR DELETE
      USING (user_id = auth.uid());
    RAISE NOTICE '✅ Policy DELETE criada';
  ELSE
    RAISE NOTICE '✅ Policy DELETE já existe';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_rls_enabled boolean;
  v_policy_count integer;
  v_has_default boolean;
  v_has_fk boolean;
BEGIN
  -- RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'categories';
  
  -- Policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'categories';
  
  -- DEFAULT
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' 
      AND table_name='categories' 
      AND column_name='user_id'
      AND column_default LIKE '%auth.uid()%'
  ) INTO v_has_default;
  
  -- FK
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' 
      AND table_name='categories'
      AND constraint_name='categories_user_id_fkey'
  ) INTO v_has_fk;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '  VERIFICAÇÃO FINAL - CATEGORIES RLS';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'RLS Habilitado: %', v_rls_enabled;
  RAISE NOTICE 'Policies criadas: %', v_policy_count;
  RAISE NOTICE 'DEFAULT auth.uid(): %', v_has_default;
  RAISE NOTICE 'FK para auth.users: %', v_has_fk;
  RAISE NOTICE '';
  
  IF v_rls_enabled AND v_policy_count = 4 AND v_has_default AND v_has_fk THEN
    RAISE NOTICE '✅ TUDO OK! Categories RLS configurado corretamente.';
  ELSE
    RAISE WARNING '⚠️  Algo não está correto. Verifique os logs acima.';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════';
END $$;


