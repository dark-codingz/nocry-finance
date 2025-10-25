-- ============================================================================
-- Migration: 031_profiles
-- ============================================================================
-- PROPÓSITO:
-- - Criar tabela de perfis de usuário (username, full_name, avatar_url)
-- - Configurar RLS para que cada usuário só acesse seu próprio perfil
-- - Adicionar trigger para updated_at automático
--
-- IMPORTANTE:
-- - Não criamos trigger em auth.users (Supabase gerencia isso)
-- - Profile é criado sob demanda (primeiro login ou via admin)
-- - Username é único (usado para exibição no dashboard)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Tabela: profiles
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,               -- nome de usuário exibido
  full_name text,                     -- nome completo (opcional, futuro)
  avatar_url text,                    -- URL do avatar (opcional, futuro)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS: Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Política: Cada usuário pode ler seu próprio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Profiles: read own'
  ) then
    create policy "Profiles: read own" on public.profiles
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Política: Cada usuário pode inserir/atualizar seu próprio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Profiles: insert own'
  ) then
    create policy "Profiles: insert own" on public.profiles
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Profiles: update own'
  ) then
    create policy "Profiles: update own" on public.profiles
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Índices
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_profiles_username on public.profiles(username);

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger: updated_at automático
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on table public.profiles is
  'Perfis de usuário com informações adicionais (username, nome completo, avatar)';

comment on column public.profiles.user_id is
  'Referência ao usuário em auth.users (PK)';

comment on column public.profiles.username is
  'Nome de usuário único para exibição (ex: "joao123")';

comment on column public.profiles.full_name is
  'Nome completo do usuário (opcional)';

comment on column public.profiles.avatar_url is
  'URL da imagem de avatar (opcional)';

-- ────────────────────────────────────────────────────────────────────────────
-- Nota sobre criação de perfil:
-- ────────────────────────────────────────────────────────────────────────────
-- Não criamos trigger em auth.users porque:
-- 1. Profile é criado sob demanda (primeiro login via upsert)
-- 2. Admin pode criar perfil ao criar usuário
-- 3. upsertMyProfile garante que sempre terá um registro
-- ────────────────────────────────────────────────────────────────────────────



