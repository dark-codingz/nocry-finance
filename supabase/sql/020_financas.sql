-- /supabase/sql/020_financas.sql
-- ============================================================
-- NoCry Finance — Módulo Finanças Pessoais (SQL + RLS + Views)
-- - Valores monetários em centavos (bigint)
-- - RLS por usuário (auth.uid() = user_id)
-- - Idempotente (CREATE IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabela: categories
-- ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('expense','income')),
  created_at  timestamptz not null default now()
);
comment on table public.categories is 'Categorias de despesas e receitas definidas pelo usuário.';

-- RLS categories
alter table public.categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='categories' and policyname='categories_manage_own'
  ) then
    create policy categories_manage_own
      on public.categories
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_user_id_type on public.categories(user_id, type);

-- ------------------------------------------------------------
-- Tabela: transactions
-- Regras de uso (UI/Service):
-- 1) Despesa/Receita: obrigar account_id XOR card_id (um, não ambos).
-- 2) Transferência: criar DUAS linhas com mesmo transfer_group_id:
--    - Saída (conta origem): type='transfer', account_id=origem, amount_cents>0
--    - Entrada (conta destino): type='transfer', account_id=destino, amount_cents>0
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  type              text not null check (type in ('expense','income','transfer')),
  account_id        uuid null references public.accounts(id) on delete set null,
  card_id           uuid null references public.cards(id) on delete set null,
  category_id       uuid null references public.categories(id) on delete set null,
  amount_cents      bigint not null check (amount_cents > 0),
  occurred_at       date not null,
  description       text null,
  transfer_group_id uuid null,
  created_at        timestamptz not null default now()
);
comment on table public.transactions is 'Registro de todas as movimentações financeiras (centavos).';

-- RLS transactions
alter table public.transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='transactions' and policyname='transactions_manage_own'
  ) then
    create policy transactions_manage_own
      on public.transactions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

create index if not exists idx_transactions_user_id              on public.transactions(user_id);
create index if not exists idx_transactions_user_id_occurred_at  on public.transactions(user_id, occurred_at);
create index if not exists idx_transactions_account_id           on public.transactions(account_id);
create index if not exists idx_transactions_card_id              on public.transactions(card_id);
create index if not exists idx_transactions_category_id          on public.transactions(category_id);
create index if not exists idx_transactions_transfer_group_id    on public.transactions(transfer_group_id);

-- ------------------------------------------------------------
-- VIEW: pf_month_summary
-- Resumo do MÊS CORRENTE (America/Sao_Paulo) para o usuário logado.
-- - Ignora transferências (type in ('expense','income') apenas)
-- - Retorna: month, total_expense_cents, total_income_cents, net_cents,
--            e agregação por categoria em JSONB.
-- ------------------------------------------------------------
create or replace view public.pf_month_summary as
with current_month as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
),
tx as (
  select
    t.user_id,
    t.type,
    t.amount_cents,
    coalesce(c.name, 'Sem Categoria') as category_name,
    t.occurred_at
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.user_id = auth.uid()
    and t.type in ('income','expense')
),
cm as (
  select
    tx.*,
    date_trunc('month', (select today from current_month))::date as month_start
  from tx
)
select
  month_start as month,
  coalesce(sum(case when type='expense' then amount_cents else 0 end),0)::bigint as total_expense_cents,
  coalesce(sum(case when type='income'  then amount_cents else 0 end),0)::bigint as total_income_cents,
  coalesce(sum(case when type='income'  then amount_cents else -amount_cents end),0)::bigint as net_cents,
  (
    select jsonb_agg(x order by x.total_cents desc)
    from (
      select category_name as category,
             type,
             sum(amount_cents)::bigint as total_cents
      from cm
      where date_trunc('month', occurred_at) = month_start
      group by category_name, type
    ) x
  ) as categories
from cm
where date_trunc('month', occurred_at) = month_start
group by month_start;

comment on view public.pf_month_summary is 'Resumo financeiro do mês corrente (America/Sao_Paulo) para o usuário autenticado.';

-- ------------------------------------------------------------
-- VIEW: card_invoices_current
-- Calcula a fatura ATUAL de cada cartão do usuário:
-- - Determina cycle_start/cycle_end a partir de closing_day e "hoje".
-- - Soma transactions.type='expense' com card_id dentro do ciclo.
-- - Calcula due_date e days_to_due (considerando due_day x closing_day).
-- ------------------------------------------------------------
create or replace view public.card_invoices_current as
with vars as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
),
cycles as (
  select
    c.id          as card_id,
    c.name        as card_name,
    c.closing_day,
    c.due_day,
    v.today,
    make_date(
      extract(year  from v.today)::int,
      extract(month from v.today)::int,
      c.closing_day
    ) as current_month_closing_date
  from public.cards c
  cross join vars v
  where c.user_id = auth.uid()
),
invoice_period as (
  select
    card_id,
    card_name,
    closing_day,        -- necessário para calcular due_date corretamente
    due_day,
    today,
    case
      when today > current_month_closing_date
        then (current_month_closing_date + interval '1 day')::date
      else (current_month_closing_date - interval '1 month' + interval '1 day')::date
    end as cycle_start,
    case
      when today > current_month_closing_date
        then (current_month_closing_date + interval '1 month')::date
      else current_month_closing_date
    end as cycle_end
  from cycles
),
calc as (
  select
    p.*,
    -- Regra de vencimento:
    -- - se due_day >= closing_day -> vencimento no mesmo mês de cycle_end
    -- - senão -> vencimento no mês seguinte a cycle_end
    case
      when p.due_day >= p.closing_day then
        make_date(extract(year from p.cycle_end)::int,
                  extract(month from p.cycle_end)::int,
                  p.due_day)
      else
        (date_trunc('month', p.cycle_end) + interval '1 month')::date
        + (p.due_day - 1) * interval '1 day'
    end::date as due_date
  from invoice_period p
)
select
  c.card_id,
  c.card_name,
  c.cycle_start,
  c.cycle_end,
  coalesce(sum(t.amount_cents), 0)::bigint as amount_cents,
  c.due_date,
  (c.due_date - c.today) as days_to_due
from calc c
left join public.transactions t
  on t.card_id = c.card_id
 and t.type = 'expense'
 and t.occurred_at between c.cycle_start and c.cycle_end
group by c.card_id, c.card_name, c.cycle_start, c.cycle_end, c.due_date, c.today;

comment on view public.card_invoices_current is 'Valor da fatura em aberto (ciclo atual) por cartão do usuário, com due_date e days_to_due.';

-- ============================================================
-- FIM
-- ============================================================

