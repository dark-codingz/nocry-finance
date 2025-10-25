-- /supabase/sql/022_fixed_bills_last_run.sql
-- Adiciona a coluna last_run_month à tabela fixed_bills para controle de duplicidade
-- no lançamento automático de despesas recorrentes.

DO $$
BEGIN
  -- Verifica se a coluna 'last_run_month' NÃO existe na tabela 'fixed_bills'.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fixed_bills'
      AND column_name = 'last_run_month'
  ) THEN
    -- Adiciona a coluna se ela não existir.
    ALTER TABLE public.fixed_bills
    ADD COLUMN last_run_month text;

    -- Adiciona um comentário para documentar o propósito da coluna.
    COMMENT ON COLUMN public.fixed_bills.last_run_month IS 'Último mês (YYYY-MM) em que a fixa foi lançada automaticamente.';
  END IF;
END;
$$;




