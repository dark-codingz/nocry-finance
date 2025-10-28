-- /supabase/sql/021_categories_archived.sql
-- Adiciona a capacidade de arquivar categorias em vez de excluí-las.

-- Garante que a operação seja idempotente.
-- O bloco DO permite a execução de lógica procedural.
DO $$
BEGIN
  -- Verifica se a coluna 'archived' NÃO existe na tabela 'categories'.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'archived'
  ) THEN
    -- Adiciona a coluna se ela não existir.
    ALTER TABLE public.categories
    ADD COLUMN archived boolean NOT NULL DEFAULT false;

    -- Adiciona um comentário para documentar o propósito da coluna.
    COMMENT ON COLUMN public.categories.archived IS 'Se true, a categoria está arquivada e não deve aparecer em selects normais.';
  END IF;
END;
$$;




