-- ============================================================================
-- Migration: 025_cards_rls
-- ============================================================================
-- PROPÓSITO:
-- - Configurar RLS e defaults para tabela cards
-- - Garantir que usuários só vejam seus próprios cartões
-- - Índices para performance
-- - Adicionar coluna archived para soft delete
--
-- ESTRUTURA ESPERADA:
-- - id, user_id, name, closing_day, due_day, credit_limit_cents (nullable)
-- - archived (boolean), created_at
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Configurar valor padrão de user_id
-- ────────────────────────────────────────────────────────────────────────────
alter table public.cards
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Garantir RLS e política coerente
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Ativar RLS se ainda não estiver ativo
  alter table public.cards enable row level security;

  -- Criar política apenas se não existir
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cards'
      and policyname='Users can manage their own cards'
  ) then
    create policy "Users can manage their own cards" on public.cards
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = coalesce(user_id, auth.uid()));
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Criar índices para performance
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_cards_user_id 
  on public.cards(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Soft delete (coluna archived)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.cards 
  add column if not exists archived boolean default false;

comment on column public.cards.archived is 
  'Indica se o cartão foi arquivado (soft delete)';

-- Índice parcial para cartões arquivados
create index if not exists idx_cards_archived 
  on public.cards(archived) 
  where archived = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on table public.cards is 
  'Cartões de crédito do usuário com informações de ciclo e limite';

comment on column public.cards.closing_day is 
  'Dia do mês de fechamento da fatura (1-28)';

comment on column public.cards.due_day is 
  'Dia do mês de vencimento da fatura (1-28)';

comment on column public.cards.limit_cents is 
  'Limite do cartão em centavos (opcional)';
-- ────────────────────────────────────────────────────────────────────────────

