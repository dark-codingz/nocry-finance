-- ============================================================================
-- Migration: 029_loan_events_notes_patch
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar coluna 'notes' em public.loan_events (se não existir)
-- - Reassegurar RLS e índices
-- - Resolver erros de "schema cache"
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Adiciona coluna notes (se faltar)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loan_events
  add column if not exists notes text;

-- ────────────────────────────────────────────────────────────────────────────
-- Reassegura RLS (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loan_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='loan_events'
      and policyname='LoanEvents: manage own'
  ) then
    create policy "LoanEvents: manage own" on public.loan_events
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Reassegura índices (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_loan_events_user_id_loan_id
  on public.loan_events(user_id, loan_id);

create index if not exists idx_loan_events_occurred_at
  on public.loan_events(loan_id, occurred_at);

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on column public.loan_events.notes is
  'Observações sobre o evento (opcional)';

-- ────────────────────────────────────────────────────────────────────────────
-- NOTA: Se erro de "schema cache" persistir, vá em Supabase:
-- Settings → API → Reset cache (ou recarregue a página do Studio)
-- ────────────────────────────────────────────────────────────────────────────



