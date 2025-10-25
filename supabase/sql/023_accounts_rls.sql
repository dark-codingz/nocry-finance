-- ============================================================================
-- Migration: 023_accounts_rls
-- ============================================================================
-- PROPÓSITO:
-- - Configurar valor padrão de user_id para auth.uid()
-- - Garantir RLS ativo com política de acesso adequada
-- - Criar índice para performance em queries filtradas por user_id
-- - Adicionar coluna archived para soft delete (opcional)
--
-- IMPORTANTE:
-- - RLS garante que usuários só vejam/editem suas próprias contas
-- - O default auth.uid() permite criar contas sem passar user_id explicitamente
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Configurar valor padrão de user_id
-- ────────────────────────────────────────────────────────────────────────────
alter table public.accounts
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Garantir RLS e política coerente
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Ativar RLS se ainda não estiver ativo
  alter table public.accounts enable row level security;

  -- Criar política apenas se não existir
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='accounts'
      and policyname='Users can manage their own accounts'
  ) then
    create policy "Users can manage their own accounts" on public.accounts
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = coalesce(user_id, auth.uid()));
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Criar índice para performance
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_accounts_user_id on public.accounts(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Soft delete (coluna archived)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.accounts 
  add column if not exists archived boolean default false;

comment on column public.accounts.archived is 
  'Indica se a conta foi arquivada (soft delete)';

-- Índice parcial para contas arquivadas
create index if not exists idx_accounts_archived 
  on public.accounts(archived) 
  where archived = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Adicionar coluna notes (observações) se não existir
-- ────────────────────────────────────────────────────────────────────────────
alter table public.accounts 
  add column if not exists notes text;

comment on column public.accounts.notes is 
  'Observações adicionais sobre a conta (agência, detalhes, etc.)';
-- ────────────────────────────────────────────────────────────────────────────



