-- ============================================================================
-- 911_profiles_rls.sql - Estrutura e RLS completa para Profiles
-- ============================================================================
-- PROPÓSITO:
-- - Garantir estrutura da tabela profiles (idempotente)
-- - Adicionar RLS granular (SELECT, INSERT, UPDATE)
-- - Trigger para updated_at automático
-- - Índices para performance
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Estrutura da tabela (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  is_whitelisted boolean default false,
  onboarding_completed_at timestamptz,
  onboarding_step text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'Perfis de usuários - 1:1 com auth.users';
comment on column public.profiles.id is 'UUID do usuário (FK para auth.users)';
comment on column public.profiles.full_name is 'Nome completo do usuário';
comment on column public.profiles.username is 'Nome de usuário único (opcional)';
comment on column public.profiles.is_whitelisted is 'Acesso a features restritas (analytics, crypto, etc)';
comment on column public.profiles.onboarding_completed_at is 'Data/hora de conclusão do onboarding';
comment on column public.profiles.onboarding_step is 'Último passo do onboarding visitado';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Índices
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_profiles_updated_at on public.profiles(updated_at);
create index if not exists idx_profiles_username on public.profiles(username) where username is not null;
create index if not exists idx_profiles_whitelisted on public.profiles(is_whitelisted) where is_whitelisted = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RLS - Habilitar
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS - Política SELECT (ler próprio perfil)
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS - Política INSERT (criar próprio perfil)
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RLS - Política UPDATE (atualizar próprio perfil)
-- ────────────────────────────────────────────────────────────────────────────
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
-- 7. Função auxiliar - Atualizar updated_at automaticamente
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

comment on function public.set_updated_at is 'Trigger para atualizar updated_at automaticamente';

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Trigger - updated_at em profiles
-- ────────────────────────────────────────────────────────────────────────────
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
-- 9. Reload do schema cache (PostgREST)
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';



