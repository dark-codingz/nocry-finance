-- ============================================================================
-- Migration: 026_fixed_remaining_view
-- ============================================================================
-- PROPÓSITO:
-- - Criar view robusta para calcular fixas restantes do mês
-- - Exclui fixas que já foram lançadas (via transactions.fixed_id)
-- - Considera apenas fixas ativas com due_day >= hoje
--
-- LÓGICA:
-- 1. Busca todas as fixas ativas do usuário com due_day >= dia de hoje
-- 2. Verifica se já existe uma transação com fixed_id = fixa.id no mês atual
-- 3. Se não existir, inclui na soma de "restantes"
--
-- IMPORTANTE:
-- Para funcionar, o serviço de "lançar fixas" DEVE preencher transactions.fixed_id
-- ao criar a transação, caso contrário a view não consegue identificar que a fixa
-- já foi lançada.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- View: pf_fixed_remaining_current_month
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.pf_fixed_remaining_current_month as
with vars as (
  -- Data de hoje no timezone Brasil
  select (now() at time zone 'America/Sao_Paulo')::date as today
),
bounds as (
  -- Define o período do mês atual e o dia de hoje
  select
    date_trunc('month', v.today)::date as start_month,
    (date_trunc('month', v.today) + interval '1 month - 1 day')::date as end_month,
    extract(day from v.today)::int as today_day
  from vars v
),
candidates as (
  -- Busca fixas ativas com dia >= hoje (ainda não vencidas no mês)
  select f.*
  from public.fixed_bills f, bounds b
  where f.user_id = auth.uid()
    and f.is_active is true
    and f.type = 'expense'
    and f.day_of_month >= b.today_day
)
select
  b.start_month,
  b.end_month,
  -- Soma apenas fixas que NÃO têm transação no mês (t.id is null)
  coalesce(sum(c.amount_cents), 0)::bigint as fixed_remaining_cents,
  count(c.id)::int as items_remaining
from bounds b
left join candidates c on true
left join public.transactions t
  on t.user_id = auth.uid()
  and t.fixed_id = c.id
  and t.occurred_at between b.start_month and b.end_month
where t.id is null or c.id is null
group by b.start_month, b.end_month;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on view public.pf_fixed_remaining_current_month is
  'Soma das despesas fixas ativas com dia >= hoje que ainda não foram lançadas no mês atual (verificado via transactions.fixed_id).';

comment on column public.pf_fixed_remaining_current_month.start_month is
  'Primeiro dia do mês atual';

comment on column public.pf_fixed_remaining_current_month.end_month is
  'Último dia do mês atual';

comment on column public.pf_fixed_remaining_current_month.fixed_remaining_cents is
  'Soma dos valores das fixas ativas restantes (ainda não lançadas) em centavos';

comment on column public.pf_fixed_remaining_current_month.items_remaining is
  'Quantidade de fixas ativas restantes (ainda não lançadas)';

-- ────────────────────────────────────────────────────────────────────────────
-- Nota Importante:
-- ────────────────────────────────────────────────────────────────────────────
-- Para que esta view funcione corretamente, o serviço que lança fixas DEVE:
-- 1. Preencher transactions.fixed_id com o ID da fixa ao criar a transação
-- 2. Usar occurred_at dentro do mês atual
--
-- Exemplo de insert correto:
-- INSERT INTO transactions (user_id, type, amount_cents, occurred_at, fixed_id)
-- VALUES (auth.uid(), 'expense', 5000, '2025-01-15', 'uuid-da-fixa');
-- ────────────────────────────────────────────────────────────────────────────



