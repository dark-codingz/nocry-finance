-- ============================================================================
-- Migration: 027_card_invoices_due_this_month
-- ============================================================================
-- PROPÓSITO:
-- - Criar view para calcular soma das faturas que vencem no mês atual
-- - Usada para cálculo do SDM projetado (disponibilidade de caixa)
-- - Considera apenas faturas com due_date dentro do mês corrente
--
-- NOTA IMPORTANTE:
-- Este valor representa compromissos de pagamento (saídas de caixa futuras).
-- Se as compras já foram registradas como despesas no momento da compra,
-- subtrair o valor da fatura pode ocasionar 'double counting' do ponto de
-- vista de resultado contábil. Aqui tratamos SDM como disponibilidade de
-- caixa projetada, por isso incluímos faturas como compromisso de pagamento.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- View: pf_card_invoices_due_this_month
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.pf_card_invoices_due_this_month as
with bounds as (
  -- Define o período do mês atual (timezone Brasil)
  select
    date_trunc('month', now() at time zone 'America/Sao_Paulo')::date as start_month,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month - 1 day')::date as end_month
)
select
  b.start_month,
  b.end_month,
  coalesce(sum(ci.amount_cents), 0)::bigint as invoices_due_this_month_cents
from bounds b
left join public.card_invoices_current ci
  on ci.due_date between b.start_month and b.end_month
group by b.start_month, b.end_month;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on view public.pf_card_invoices_due_this_month is
  'Soma das faturas de cartão que vencem no mês corrente. Usada para cálculo de SDM (disponibilidade de caixa projetada).';

comment on column public.pf_card_invoices_due_this_month.start_month is
  'Primeiro dia do mês atual';

comment on column public.pf_card_invoices_due_this_month.end_month is
  'Último dia do mês atual';

comment on column public.pf_card_invoices_due_this_month.invoices_due_this_month_cents is
  'Soma total das faturas que vencem no mês corrente (em centavos)';

-- ────────────────────────────────────────────────────────────────────────────
-- Nota sobre RLS:
-- Não é necessário RLS direta nesta view porque:
-- - card_invoices_current já filtra por auth.uid()
-- - Esta view é um agregado sem identificação de usuário
-- - A filtragem por usuário acontece automaticamente via join
-- ────────────────────────────────────────────────────────────────────────────




