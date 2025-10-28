-- ============================================================================
-- Migration: 029_loan_events_rls_fix
-- ============================================================================
-- PROPÓSITO:
-- - Garantir default user_id = auth.uid()
-- - Trigger para auto-preencher user_id em inserts
-- - Políticas RLS separadas por operação (SELECT, INSERT, UPDATE, DELETE)
-- - Validação: INSERT só permite eventos de loans do próprio usuário
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Garantir default do user_id
-- ────────────────────────────────────────────────────────────────────────────
alter table public.loan_events
  alter column user_id set default auth.uid();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Trigger para setar user_id = auth.uid() em qualquer insert
-- ────────────────────────────────────────────────────────────────────────────
-- (Mesmo se o client não enviar, o trigger preenche automaticamente)
create or replace function public.enforce_user_id_loan_events()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_loan_events_user_id on public.loan_events;
create trigger trg_loan_events_user_id
before insert on public.loan_events
for each row execute function public.enforce_user_id_loan_events();

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Policies: Remover política genérica e criar políticas específicas
-- ────────────────────────────────────────────────────────────────────────────

-- Apaga política antiga se existir
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='loan_events' and policyname='LoanEvents: manage own'
  ) then
    drop policy "LoanEvents: manage own" on public.loan_events;
  end if;
end $$;

-- Garante RLS habilitado
alter table public.loan_events enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- SELECT: Ver apenas os próprios eventos
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "loan_events_select_own" on public.loan_events;
create policy "loan_events_select_own" on public.loan_events
  for select using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- INSERT: Só pode inserir se o evento for do próprio usuário E o loan pertencer ao usuário
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "loan_events_insert_own_loan" on public.loan_events;
create policy "loan_events_insert_own_loan" on public.loan_events
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.loans l
      where l.id = loan_id and l.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- UPDATE: Só pode atualizar seus próprios eventos
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "loan_events_update_own" on public.loan_events;
create policy "loan_events_update_own" on public.loan_events
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- DELETE: Só pode deletar seus próprios eventos
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "loan_events_delete_own" on public.loan_events;
create policy "loan_events_delete_own" on public.loan_events
  for delete using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- Índices úteis (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_loan_events_user_id_loan_id 
  on public.loan_events(user_id, loan_id);

create index if not exists idx_loan_events_occurred_at
  on public.loan_events(loan_id, occurred_at);

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on function public.enforce_user_id_loan_events() is
  'Trigger function: Auto-preenche user_id com auth.uid() em inserts de loan_events';

comment on policy "loan_events_select_own" on public.loan_events is
  'Usuário pode ver apenas seus próprios eventos';

comment on policy "loan_events_insert_own_loan" on public.loan_events is
  'Usuário só pode inserir eventos em seus próprios empréstimos';

comment on policy "loan_events_update_own" on public.loan_events is
  'Usuário só pode atualizar seus próprios eventos';

comment on policy "loan_events_delete_own" on public.loan_events is
  'Usuário só pode deletar seus próprios eventos';

-- ────────────────────────────────────────────────────────────────────────────
-- NOTA: Se erro de "schema cache" persistir, vá em Supabase:
-- Settings → API → Reset cache (ou recarregue a página do Studio)
-- ────────────────────────────────────────────────────────────────────────────




