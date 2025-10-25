-- ============================================================================
-- 901_rpc_create_card_installments.sql - RPC Consolidada (JSON)
-- ============================================================================
-- PROPÓSITO:
-- - Versão ÚNICA e DEFINITIVA da RPC create_card_installments
-- - Usa parâmetro JSON (evita problemas de ordem/cache)
-- - Inclui NOTIFY para auto-reload do schema cache
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Limpeza: remover TODAS as versões antigas
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean);
drop function if exists public.create_card_installments(uuid, uuid, text, date, int, boolean, bigint);
drop function if exists public.create_card_installments(jsonb);
drop function if exists public.create_card_installments_v1(uuid, uuid, text, date, int, boolean, bigint);

-- ────────────────────────────────────────────────────────────────────────────
-- Campos auxiliares (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists installment_index int,
  add column if not exists installment_total int;

create index if not exists idx_transactions_group on public.transactions(transfer_group_id);
create index if not exists idx_transactions_card_install on public.transactions(card_id, installment_index, installment_total);

-- ────────────────────────────────────────────────────────────────────────────
-- Versão ÚNICA (JSON): criar parcelas no cartão
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.create_card_installments(p jsonb)
returns table (transfer_group_id uuid, created_ids uuid[])
language plpgsql
security definer
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid := gen_random_uuid();
  v_ids uuid[] := '{}';

  v_card_id uuid;
  v_category_id uuid;
  v_description text;
  v_first_date date;
  v_num_installments int;
  v_start_next_invoice boolean;
  v_total_cents bigint;

  v_card record;
  v_base bigint;
  v_remainder bigint;
  v_amount bigint;
  v_first date;
  v_i int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  v_card_id            := nullif(p->>'card_id','')::uuid;
  v_category_id        := nullif(p->>'category_id','')::uuid;
  v_description        := coalesce(p->>'description','Compra parcelada');
  v_first_date         := (p->>'first_date')::date;
  v_num_installments   := (p->>'num_installments')::int;
  v_start_next_invoice := coalesce((p->>'start_next_invoice')::boolean,false);
  v_total_cents        := (p->>'total_cents')::bigint;

  if v_card_id is null then raise exception 'card_id is required'; end if;
  if v_first_date is null then raise exception 'first_date is required'; end if;
  if v_num_installments is null or v_num_installments < 1 or v_num_installments > 12 then
    raise exception 'num_installments must be between 1 and 12';
  end if;
  if v_total_cents is null or v_total_cents <= 0 then raise exception 'total_cents must be positive'; end if;

  select * into v_card from public.cards where id = v_card_id and user_id = v_user;
  if not found then raise exception 'Card not found'; end if;

  v_first := case when v_start_next_invoice
                  then (date_trunc('month', v_first_date) + interval '1 month')::date
                  else v_first_date end;

  v_base := v_total_cents / v_num_installments;
  v_remainder := v_total_cents % v_num_installments;

  for v_i in 1..v_num_installments loop
    v_amount := v_base + case when v_i <= v_remainder then 1 else 0 end;

    insert into public.transactions (
      id, user_id, type, account_id, card_id, category_id,
      amount_cents, occurred_at, description, transfer_group_id,
      installment_index, installment_total, created_at
    )
    values (
      gen_random_uuid(), v_user, 'expense', null, v_card_id, v_category_id,
      v_amount, (v_first + (v_i - 1) * interval '1 month')::date, v_description, v_group,
      v_i, v_num_installments, now()
    )
    returning id into v_ids;
  end loop;

  return query select v_group, v_ids;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Permissões
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.create_card_installments(jsonb) from public;
grant execute on function public.create_card_installments(jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Reload automático do schema cache (PostgREST)
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';



