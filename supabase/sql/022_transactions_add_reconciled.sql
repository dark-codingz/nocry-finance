-- ============================================================================
-- Migration: 022_transactions_add_reconciled
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar coluna 'reconciled' (boolean) à tabela transactions
-- - Permite marcar transações como conciliadas (reconciliadas com extrato bancário)
-- - Default: false (não conciliada)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Adicionar coluna reconciled
-- ────────────────────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists reconciled boolean default false;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentário descritivo
-- ────────────────────────────────────────────────────────────────────────────
comment on column public.transactions.reconciled is 
  'Indica se a transação foi conciliada com o extrato bancário/cartão';

-- ────────────────────────────────────────────────────────────────────────────
-- Índice para filtros por reconciled (opcional, mas útil para relatórios)
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_transactions_reconciled 
  on public.transactions(reconciled) 
  where reconciled = false;

-- Nota: Índice parcial (WHERE reconciled = false) é mais eficiente para buscar
-- transações pendentes de conciliação
-- ────────────────────────────────────────────────────────────────────────────



