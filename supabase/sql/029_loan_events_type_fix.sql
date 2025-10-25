-- ============================================================================
-- Migration: 029_loan_events_type_fix
-- ============================================================================
-- PROPÓSITO:
-- - Normalizar tipos de eventos (lowercase + aliases)
-- - Garantir CHECK constraint com os 4 tipos oficiais
-- - Tolerar aliases comuns e mapeá-los automaticamente
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Trigger: Normaliza tipo e mapeia aliases comuns
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.normalize_loan_event_type()
returns trigger language plpgsql as $$
begin
  if new.type is null then
    return new;
  end if;

  -- Força lowercase
  new.type := lower(new.type);

  -- Mapeia aliases comuns para os 4 tipos oficiais:
  -- - disbursement: desembolso inicial
  -- - topup: novo aporte / empréstimo adicional
  -- - repayment: pagamento recebido
  -- - interest: juros aplicados

  if new.type in ('payment','pay','pago','pagamento') then
    new.type := 'repayment';
  elsif new.type in ('deposit','aporte','top-up','top up','add','add_funds') then
    new.type := 'topup';
  elsif new.type in ('juros','interest_in','bonus') then
    new.type := 'interest';
  elsif new.type in ('desembolso','initial','start','principal') then
    new.type := 'disbursement';
  end if;

  return new;
end $$;

-- Recria o trigger (idempotente)
drop trigger if exists trg_loan_events_type_norm on public.loan_events;
create trigger trg_loan_events_type_norm
before insert on public.loan_events
for each row execute function public.normalize_loan_event_type();

comment on function public.normalize_loan_event_type() is
  'Trigger: Normaliza tipo de evento (lowercase + aliases) antes de insert';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) CHECK Constraint: Garante apenas os 4 tipos oficiais
-- ────────────────────────────────────────────────────────────────────────────
-- Remove constraint antigo se existir
alter table public.loan_events
  drop constraint if exists loan_events_type_check;

-- Adiciona constraint com os 4 tipos oficiais
alter table public.loan_events
  add constraint loan_events_type_check
  check (type in ('disbursement', 'topup', 'repayment', 'interest'));

comment on constraint loan_events_type_check on public.loan_events is
  'Apenas 4 tipos válidos: disbursement, topup, repayment, interest';

-- ────────────────────────────────────────────────────────────────────────────
-- NOTA: Se erro de "schema cache" persistir após aplicar:
-- 1. Vá em Supabase Dashboard → Settings → API
-- 2. Clique em "Reset cache" ou recarregue a página do Studio
-- ────────────────────────────────────────────────────────────────────────────



