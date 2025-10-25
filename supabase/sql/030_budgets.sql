-- /supabase/sql/030_budgets.sql
-- Cria a tabela budgets para armazenar orçamentos mensais por usuário.
-- Propósito: Permitir que o usuário defina quanto deseja gastar no mês,
-- possibilitando cálculos de orçamento disponível e sugestão de gasto diário.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

comment on table public.budgets is 'Orçamentos mensais definidos pelo usuário para controle de gastos.';
comment on column public.budgets.month is 'Mês no formato YYYY-MM ao qual o orçamento se aplica.';
comment on column public.budgets.amount_cents is 'Valor do orçamento em centavos.';

alter table public.budgets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='budgets' and policyname='budgets_own'
  ) then
    create policy budgets_own on public.budgets for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_budgets_user_id_month on public.budgets(user_id, month);




