-- ============================================================================
-- 912_onboarding_flag.sql - Adicionar flag boolean onboarding_done
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar coluna onboarding_done (boolean) para verificação simples
-- - Simplifica a lógica de redirect (true/false em vez de checar timestamptz)
-- - Mantém onboarding_completed_at para histórico
-- - Garante RLS e trigger
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Garantir estrutura da tabela (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  is_whitelisted boolean default false,
  onboarding_completed_at timestamptz,
  onboarding_step text,
  onboarding_done boolean default false,  -- << NOVA COLUNA
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Adicionar coluna onboarding_done se não existir
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists onboarding_done boolean default false;

comment on column public.profiles.onboarding_done
  is 'Flag booleana: true quando o usuário concluiu o onboarding. Default false.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Sincronizar dados existentes (se onboarding_completed_at preenchido)
-- ────────────────────────────────────────────────────────────────────────────
-- Para perfis que já completaram (onboarding_completed_at NOT NULL),
-- mas ainda têm onboarding_done = false, atualizar para true
update public.profiles
set onboarding_done = true
where onboarding_completed_at is not null
  and onboarding_done = false;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS - Garantir políticas básicas
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- SELECT próprio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'select own profile'
  ) then
    create policy "select own profile" on public.profiles
      for select using (auth.uid() = id);
  end if;
end$$;

-- INSERT próprio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'insert own profile'
  ) then
    create policy "insert own profile" on public.profiles
      for insert with check (auth.uid() = id);
  end if;
end$$;

-- UPDATE próprio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'update own profile'
  ) then
    create policy "update own profile" on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Trigger updated_at (se não existir)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_profiles_set_updated_at'
  ) then
    create trigger trg_profiles_set_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;
end$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Reload do schema cache (PostgREST)
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Diagnóstico - Verificar colunas de onboarding
-- ────────────────────────────────────────────────────────────────────────────
select 
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'profiles'
  and column_name in ('onboarding_done', 'onboarding_completed_at', 'onboarding_step')
order by column_name;

-- Resultado esperado:
-- onboarding_completed_at | timestamp with time zone | NULL | YES
-- onboarding_done         | boolean                  | false | YES
-- onboarding_step         | text                     | NULL | YES




