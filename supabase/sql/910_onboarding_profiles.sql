-- ============================================================================
-- 910_onboarding_profiles.sql - Campos de Onboarding em Profiles
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar campos para controlar o fluxo de onboarding do usuário
-- - onboarding_completed_at: marca quando o usuário concluiu o setup inicial
-- - onboarding_step: rastreia o último passo visitado
-- ============================================================================

-- 1) Adicionar colunas (idempotente)
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step text;

comment on column public.profiles.onboarding_completed_at is 'Data/hora de conclusão do onboarding pelo usuário.';
comment on column public.profiles.onboarding_step is 'Passo atual/último passo visto do onboarding.';

-- 2) Garantir políticas RLS para UPDATE do próprio perfil
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    alter table public.profiles enable row level security;
    create policy "Users can update own profile" on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- 3) Reload do schema cache
NOTIFY pgrst, 'reload schema';



