-- ============================================================================
-- Migration: 024_fixed_expenses_rls
-- ============================================================================
-- PROPÓSITO:
-- - Configurar RLS e defaults para tabela fixed_expenses
-- - Garantir que usuários só vejam suas próprias contas fixas
-- - Índices para performance
--
-- ESTRUTURA ESPERADA:
-- - id, user_id, name, type (expense/income), amount_cents, due_day (1-28)
-- - account_id, card_id, category_id (nullable FKs)
-- - active (boolean), created_at
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Configurar valor padrão de user_id
-- ────────────────────────────────────────────────────────────────────────────
alter table public.fixed_expenses
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Garantir RLS e política coerente
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Ativar RLS se ainda não estiver ativo
  alter table public.fixed_expenses enable row level security;

  -- Criar política apenas se não existir
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='fixed_expenses'
      and policyname='Users can manage their own fixed_expenses'
  ) then
    create policy "Users can manage their own fixed_expenses" on public.fixed_expenses
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = coalesce(user_id, auth.uid()));
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Criar índices para performance
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_fixed_expenses_user_id 
  on public.fixed_expenses(user_id);

create index if not exists idx_fixed_expenses_active 
  on public.fixed_expenses(user_id, active);

-- Índice composto para queries comuns (user + active + due_day)
create index if not exists idx_fixed_expenses_user_active_due 
  on public.fixed_expenses(user_id, active, due_day);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on table public.fixed_expenses is 
  'Despesas e receitas recorrentes mensais (contas fixas)';

comment on column public.fixed_expenses.due_day is 
  'Dia do mês para lançamento (1-28, evita problemas com meses variáveis)';

comment on column public.fixed_expenses.active is 
  'Indica se a conta fixa está ativa e deve ser lançada automaticamente';
-- ────────────────────────────────────────────────────────────────────────────




