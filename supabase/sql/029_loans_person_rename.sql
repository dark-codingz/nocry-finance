-- ============================================================================
-- Migration: 029_loans_person_rename
-- ============================================================================
-- PROPÓSITO:
-- - Renomear coluna 'person' para 'person_name' (se necessário)
-- - Renomear coluna 'note' para 'notes' (se necessário)
-- - Garantir NOT NULL em person_name
-- - Recriar view loans_summary com os nomes corretos
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Renomeia 'person' para 'person_name' (se pessoa existir e person_name não)
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'person'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'person_name'
  ) then
    alter table public.loans
      rename column person to person_name;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Renomeia 'note' para 'notes' (se note existir e notes não)
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'note'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'notes'
  ) then
    alter table public.loans
      rename column note to notes;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Garante NOT NULL em person_name
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'person_name'
  ) then
    alter table public.loans
      alter column person_name set not null;
  end if;
exception when others then
  -- Se falhar, pode ser porque há valores null
  raise notice 'Não foi possível tornar person_name NOT NULL (pode haver valores null)';
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- (Re)cria a view de resumo com os nomes corretos
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.loans_summary as
select
  l.id,
  l.user_id,
  l.person_name,
  l.started_at,
  l.notes,
  l.interest_mode,
  l.interest_rate_bps,
  l.last_interest_applied_at,
  l.status,
  l.created_at,
  coalesce(sum(case when e.type in ('disbursement','topup') then e.amount_cents else 0 end), 0)::bigint as principal_cents,
  coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0)::bigint as paid_cents,
  coalesce(sum(case when e.type = 'interest' then e.amount_cents else 0 end), 0)::bigint as interest_cents,
  (
    coalesce(sum(case when e.type in ('disbursement','topup','interest') then e.amount_cents else 0 end), 0)
    - coalesce(sum(case when e.type = 'repayment' then e.amount_cents else 0 end), 0)
  )::bigint as balance_cents
from public.loans l
left join public.loan_events e
  on e.loan_id = l.id and e.user_id = l.user_id
where l.user_id = auth.uid()
group by l.id;

comment on view public.loans_summary is
  'Resumo (principal, pagos, juros, saldo) por empréstimo do usuário.';

-- ────────────────────────────────────────────────────────────────────────────
-- Remove views antigas que dependem das colunas person/note
-- ────────────────────────────────────────────────────────────────────────────
drop view if exists public.loan_balances cascade;

-- ────────────────────────────────────────────────────────────────────────────
-- Remove colunas antigas (se existirem)
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Remover coluna 'person' se existir (com cascade para views dependentes)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'person'
  ) then
    alter table public.loans drop column person cascade;
  end if;

  -- Remover coluna 'note' se existir (com cascade para views dependentes)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loans'
      and column_name = 'note'
  ) then
    alter table public.loans drop column note cascade;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Comentários descritivos
-- ────────────────────────────────────────────────────────────────────────────
comment on column public.loans.person_name is
  'Nome da pessoa que recebeu o empréstimo';

comment on column public.loans.notes is
  'Observações sobre o empréstimo';

