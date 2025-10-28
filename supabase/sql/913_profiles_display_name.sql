-- ============================================================================
-- 913_profiles_display_name.sql - Adicionar display_name aos Profiles
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar coluna display_name à tabela profiles
-- - Backfill com dados existentes de full_name
-- - Centralizar lógica de nome exibido no app
-- - Idempotente (pode rodar múltiplas vezes sem quebrar)
-- ============================================================================

-- 1) Adicionar coluna display_name (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name text;
    RAISE NOTICE 'Coluna display_name adicionada à tabela profiles';
  ELSE
    RAISE NOTICE 'Coluna display_name já existe na tabela profiles';
  END IF;
END $$;

-- 2) Backfill: copiar full_name para display_name onde estiver vazio
UPDATE public.profiles
SET display_name = full_name
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 3) Criar índice para queries de busca por nome (opcional, performance)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name 
  ON public.profiles (display_name);

-- 4) Comentário de documentação
COMMENT ON COLUMN public.profiles.display_name IS 'Nome para exibição na UI (preferência sobre full_name)';

-- 5) Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';




