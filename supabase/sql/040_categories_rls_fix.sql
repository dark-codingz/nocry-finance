-- ============================================================================
-- Categories RLS Fix - Row Level Security
-- ============================================================================
-- OBJETIVO:
-- - Garantir coluna user_id com DEFAULT auth.uid()
-- - Habilitar RLS
-- - Criar policies CRUD para usuário dono
-- - Trigger de fallback para garantir user_id
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- A) DIAGNÓSTICO (comentado - rodar manualmente se precisar)
-- ────────────────────────────────────────────────────────────────────────────
/*
-- Ver estrutura da tabela
SELECT
  c.table_schema, c.table_name, c.column_name, c.data_type, c.column_default, c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'categories'
ORDER BY c.ordinal_position;

-- Ver status RLS
SELECT
  schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'categories';

-- Ver policies existentes
SELECT
  policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'categories';

-- Ver FKs
SELECT
  tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' AND tc.table_name = 'categories' AND tc.constraint_type = 'FOREIGN KEY';
*/

-- ────────────────────────────────────────────────────────────────────────────
-- B) MIGRATION - Idempotente
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Garantir coluna user_id com DEFAULT auth.uid()
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
    ALTER TABLE public.categories
    ADD COLUMN user_id uuid;
    
    RAISE NOTICE 'Coluna user_id adicionada (NULLABLE)';
    
    -- Se houver dados existentes, precisamos popular user_id
    IF v_has_data THEN
      -- Tentar pegar o primeiro user_id da tabela auth.users
      SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
      
      IF v_first_user_id IS NOT NULL THEN
        -- Atualizar todos os registros existentes com este user_id
        UPDATE public.categories SET user_id = v_first_user_id WHERE user_id IS NULL;
        RAISE NOTICE 'Dados existentes atualizados com user_id: %', v_first_user_id;
      ELSE
        -- Se não houver usuários, deletar as categorias órfãs
        DELETE FROM public.categories WHERE user_id IS NULL;
        RAISE NOTICE 'Categorias órfãs deletadas (não havia usuários na tabela auth.users)';
      END IF;
    END IF;
    
    -- Agora tornar NOT NULL e adicionar DEFAULT
    ALTER TABLE public.categories
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN user_id SET DEFAULT auth.uid();
    
    RAISE NOTICE 'Coluna user_id agora é NOT NULL com DEFAULT auth.uid()';
  ELSE
    -- Se existe mas não tem DEFAULT, adicionar
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' 
        AND table_name='categories' 
        AND column_name='user_id' 
        AND column_default LIKE '%auth.uid()%'
    ) THEN
      ALTER TABLE public.categories
      ALTER COLUMN user_id SET DEFAULT auth.uid();
      
      RAISE NOTICE 'DEFAULT auth.uid() adicionado à coluna user_id';
    ELSE
      RAISE NOTICE 'Coluna user_id já existe com DEFAULT correto';
    END IF;
  END IF;
END $$;

-- 2) Garantir FK em auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public' 
      AND table_name='categories' 
      AND constraint_type='FOREIGN KEY' 
      AND constraint_name='categories_user_id_fkey'
  ) THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'FK categories_user_id_fkey criada';
  ELSE
    RAISE NOTICE 'FK categories_user_id_fkey já existe';
  END IF;
END $$;

-- 3) Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4) Policies CRUD por dono (idempotentes)
DO $$
BEGIN
  -- Policy SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_select_own'
  ) THEN
    CREATE POLICY "categories_select_own"
    ON public.categories
    FOR SELECT
    USING (user_id = auth.uid());
    
    RAISE NOTICE 'Policy categories_select_own criada';
  ELSE
    RAISE NOTICE 'Policy categories_select_own já existe';
  END IF;

  -- Policy INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_insert_own'
  ) THEN
    CREATE POLICY "categories_insert_own"
    ON public.categories
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
    
    RAISE NOTICE 'Policy categories_insert_own criada';
  ELSE
    RAISE NOTICE 'Policy categories_insert_own já existe';
  END IF;

  -- Policy UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_update_own'
  ) THEN
    CREATE POLICY "categories_update_own"
    ON public.categories
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
    
    RAISE NOTICE 'Policy categories_update_own criada';
  ELSE
    RAISE NOTICE 'Policy categories_update_own já existe';
  END IF;

  -- Policy DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='categories' AND policyname='categories_delete_own'
  ) THEN
    CREATE POLICY "categories_delete_own"
    ON public.categories
    FOR DELETE
    USING (user_id = auth.uid());
    
    RAISE NOTICE 'Policy categories_delete_own criada';
  ELSE
    RAISE NOTICE 'Policy categories_delete_own já existe';
  END IF;
END $$;

-- 5) Trigger fallback (garantir user_id mesmo sem DEFAULT)
CREATE OR REPLACE FUNCTION public.set_row_user_id()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se user_id não foi setado, tentar usar auth.uid()
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  -- Se ainda for NULL, a constraint NOT NULL vai pegar
  -- (não queremos falhar aqui no trigger, deixar o Postgres validar)
  
  RETURN NEW;
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname='trg_categories_set_user_id'
  ) THEN
    CREATE TRIGGER trg_categories_set_user_id
    BEFORE INSERT ON public.categories
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_row_user_id();
    
    RAISE NOTICE 'Trigger trg_categories_set_user_id criado';
  ELSE
    RAISE NOTICE 'Trigger trg_categories_set_user_id já existe';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_rls_enabled boolean;
  v_policy_count integer;
BEGIN
  -- Verificar RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'categories';
  
  -- Contar policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'categories';
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'VERIFICAÇÃO FINAL - CATEGORIES';
  RAISE NOTICE '================================';
  RAISE NOTICE 'RLS Habilitado: %', v_rls_enabled;
  RAISE NOTICE 'Policies criadas: %', v_policy_count;
  RAISE NOTICE '================================';
END $$;

