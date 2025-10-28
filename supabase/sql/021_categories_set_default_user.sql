-- ============================================================================
-- Migration: 021_categories_set_default_user
-- ============================================================================
-- PROPÓSITO:
-- - Configurar valor padrão de user_id para auth.uid()
-- - Garantir RLS ativo com política de acesso adequada
-- - Criar índice para performance em queries filtradas por user_id
--
-- IMPORTANTE:
-- - Esta migration deve ser executada após a criação inicial da tabela categories
-- - RLS garante que usuários só vejam/editem suas próprias categorias
-- - O default auth.uid() permite criar categorias sem passar user_id explicitamente
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Configurar valor padrão de user_id
-- ────────────────────────────────────────────────────────────────────────────
alter table public.categories
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Garantir RLS e política coerente
-- ────────────────────────────────────────────────────────────────────────────
-- Nota: A função do $$ garante idempotência (não cria política duplicada)
do $$
begin
  -- Ativar RLS se ainda não estiver ativo
  alter table public.categories enable row level security;

  -- Criar política apenas se não existir
  if not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='categories'
      and policyname='Users can manage their own categories'
  ) then
    create policy "Users can manage their own categories" on public.categories
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = coalesce(user_id, auth.uid()));
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Criar índice para performance
-- ────────────────────────────────────────────────────────────────────────────
-- Índice otimiza queries filtradas por user_id (usado em todas as operações)
create index if not exists idx_categories_user_id on public.categories(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- VALIDAÇÃO (opcional - descomente para testar)
-- ────────────────────────────────────────────────────────────────────────────
-- select
--   column_name,
--   column_default,
--   is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'categories'
--   and column_name = 'user_id';
--
-- select * from pg_policies where tablename = 'categories';
-- ────────────────────────────────────────────────────────────────────────────




