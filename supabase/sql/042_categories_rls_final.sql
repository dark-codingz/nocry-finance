-- ============================================================================
-- Categories RLS - SOLUÇÃO DEFINITIVA
-- ============================================================================
-- OBJETIVO:
-- - FK correta para auth.users
-- - Policies RLS PERMISSIVE corretas
-- - DEFAULT auth.uid() funcionando
-- - RPC de debug (whoami) para diagnóstico
-- - Limpar policies antigas e recriar do zero
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0) REMOVER TRIGGERS ANTIGOS (se existirem)
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_categories_set_user_id ON public.categories;
DROP FUNCTION IF EXISTS public.set_row_user_id();

-- ────────────────────────────────────────────────────────────────────────────
-- 1) CORRIGIR COLUNA user_id + FK
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_data boolean;
  v_first_user_id uuid;
BEGIN
  -- Verificar se tem dados
  SELECT EXISTS(SELECT 1 FROM public.categories LIMIT 1) INTO v_has_data;
  
  -- Adicionar coluna se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categories' AND column_name='user_id'
  ) THEN
    -- Adicionar como nullable primeiro
    ALTER TABLE public.categories ADD COLUMN user_id uuid;
    RAISE NOTICE '✅ Coluna user_id adicionada';
    
    -- Popular dados existentes
    IF v_has_data THEN
      SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
      IF v_first_user_id IS NOT NULL THEN
        UPDATE public.categories SET user_id = v_first_user_id WHERE user_id IS NULL;
        RAISE NOTICE '✅ Dados populados com user_id: %', v_first_user_id;
      ELSE
        DELETE FROM public.categories WHERE user_id IS NULL;
        RAISE NOTICE '⚠️  Categorias órfãs deletadas';
      END IF;
    END IF;
    
    -- Tornar NOT NULL + DEFAULT
    ALTER TABLE public.categories
      ALTER COLUMN user_id SET NOT NULL,
      ALTER COLUMN user_id SET DEFAULT auth.uid();
    RAISE NOTICE '✅ user_id: NOT NULL + DEFAULT auth.uid()';
  ELSE
    -- Garantir DEFAULT
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='categories' 
        AND column_name='user_id' AND column_default LIKE '%auth.uid()%'
    ) THEN
      ALTER TABLE public.categories ALTER COLUMN user_id SET DEFAULT auth.uid();
      RAISE NOTICE '✅ DEFAULT auth.uid() adicionado';
    END IF;
  END IF;
END $$;

-- Remover FK antiga e recriar
DO $$
BEGIN
  ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
  
  ALTER TABLE public.categories
    ADD CONSTRAINT categories_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  
  RAISE NOTICE '✅ FK categories_user_id_fkey criada/atualizada';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) HABILITAR RLS
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS habilitado';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) LIMPAR POLICIES ANTIGAS E RECRIAR
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  -- Deletar todas as policies antigas
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', r.policyname);
    RAISE NOTICE '🗑️  Policy antiga removida: %', r.policyname;
  END LOOP;
END $$;

-- Recriar policies (PERMISSIVE)
DO $$
BEGIN
  CREATE POLICY "categories_select_own"
    ON public.categories FOR SELECT
    USING (user_id = auth.uid());

  CREATE POLICY "categories_insert_own"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "categories_update_own"
    ON public.categories FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "categories_delete_own"
    ON public.categories FOR DELETE
    USING (user_id = auth.uid());

  RAISE NOTICE '✅ 4 policies criadas (SELECT/INSERT/UPDATE/DELETE)';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) RPC DE DEBUG (whoami)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.debug_whoami()
RETURNS json 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT json_build_object(
    'uid', auth.uid(),
    'role', current_user,
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;

COMMENT ON FUNCTION public.debug_whoami() IS 'Debug: retorna uid e role do request atual';

DO $$
BEGIN
  RAISE NOTICE '✅ RPC debug_whoami() criada';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_rls_enabled boolean;
  v_policy_count integer;
  v_has_default boolean;
  v_has_fk boolean;
  v_col_nullable text;
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
    WHERE table_schema='public' AND table_name='categories' 
      AND column_name='user_id' AND column_default LIKE '%auth.uid()%'
  ) INTO v_has_default;
  
  -- FK
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='categories'
      AND constraint_name='categories_user_id_fkey'
  ) INTO v_has_fk;
  
  -- Nullable
  SELECT is_nullable INTO v_col_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='categories' AND column_name='user_id';
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  VERIFICAÇÃO FINAL - CATEGORIES RLS';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS Habilitado: %', v_rls_enabled;
  RAISE NOTICE 'Policies ativas: %', v_policy_count;
  RAISE NOTICE 'DEFAULT auth.uid(): %', v_has_default;
  RAISE NOTICE 'FK para auth.users: %', v_has_fk;
  RAISE NOTICE 'user_id NOT NULL: %', (v_col_nullable = 'NO');
  RAISE NOTICE '';
  
  IF v_rls_enabled AND v_policy_count = 4 AND v_has_default AND v_has_fk AND v_col_nullable = 'NO' THEN
    RAISE NOTICE '✅ ✅ ✅  TUDO PERFEITO! Categories RLS 100%% OK';
  ELSE
    RAISE WARNING '⚠️  Algo não está correto:';
    IF NOT v_rls_enabled THEN RAISE WARNING '  - RLS não está habilitado'; END IF;
    IF v_policy_count != 4 THEN RAISE WARNING '  - Esperado 4 policies, encontrado %', v_policy_count; END IF;
    IF NOT v_has_default THEN RAISE WARNING '  - DEFAULT auth.uid() ausente'; END IF;
    IF NOT v_has_fk THEN RAISE WARNING '  - FK para auth.users ausente'; END IF;
    IF v_col_nullable != 'NO' THEN RAISE WARNING '  - user_id deveria ser NOT NULL'; END IF;
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) SANITY CHECK (query manual para rodar depois se quiser)
-- ────────────────────────────────────────────────────────────────────────────
/*
-- Ver estrutura
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='categories'
ORDER BY ordinal_position;

-- Ver policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname='public' AND tablename='categories'
ORDER BY policyname;

-- Testar whoami
SELECT public.debug_whoami();
*/

