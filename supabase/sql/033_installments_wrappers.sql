-- ============================================================================
-- 033_installments_wrappers.sql - Função Canônica + Wrappers
-- ============================================================================
-- PROPÓSITO:
-- - Criar uma função interna (canônica) _v1
-- - Criar dois wrappers públicos com diferentes assinaturas
-- - Suportar múltiplas ordens de parâmetros sem quebrar o cliente
--
-- ESTRATÉGIA:
-- - Função canônica: create_card_installments_v1 (implementação real)
-- - Wrapper A: total por último (ordem usada pelo cliente atual)
-- - Wrapper B: total antes da data (ordem alternativa)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Campos auxiliares (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists installment_index int,
  add column if not exists installment_total int;

create index if not exists idx_transactions_group 
  on public.transactions(transfer_group_id);

create index if not exists idx_transactions_card_install 
  on public.transactions(card_id, installment_index, installment_total);

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Apagar TODAS as versões anteriores (limpeza completa)
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean);
drop function if exists public.create_card_installments(uuid, uuid, text, date, int, boolean, bigint);
drop function if exists public.create_card_installments_v1(uuid, uuid, text, date, int, boolean, bigint);

-- ────────────────────────────────────────────────────────────────────────────
-- 3) FUNÇÃO CANÔNICA (implementação real) - create_card_installments_v1
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.create_card_installments_v1(
  p_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_first_date date,
  p_num_installments int,
  p_start_next_invoice boolean,
  p_total_cents bigint
)
returns table (transfer_group_id uuid, created_ids uuid[])
language plpgsql
security definer
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid := gen_random_uuid();
  v_ids uuid[] := '{}';
  v_i int;
  v_base bigint;
  v_remainder bigint;
  v_amount bigint;
  v_first date;
  v_card record;
  v_id uuid;
begin
  -- ──────────────────────────────────────────────────────────────────
  -- Validações
  -- ──────────────────────────────────────────────────────────────────
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_num_installments < 1 or p_num_installments > 12 then
    raise exception 'Invalid installments (must be 1-12)';
  end if;

  if p_total_cents <= 0 then
    raise exception 'Amount must be positive';
  end if;

  -- Verificar se o cartão pertence ao usuário
  select * into v_card 
  from public.cards 
  where id = p_card_id and user_id = v_user;
  
  if not found then
    raise exception 'Card not found';
  end if;

  -- ──────────────────────────────────────────────────────────────────
  -- Calcular data da primeira parcela
  -- ──────────────────────────────────────────────────────────────────
  if p_start_next_invoice then
    -- Empurrar para o próximo ciclo (soma 1 mês)
    v_first := (date_trunc('month', p_first_date) + interval '1 month')::date;
  else
    -- Usar a data informada
    v_first := p_first_date;
  end if;

  -- ──────────────────────────────────────────────────────────────────
  -- Distribuir valor total nas parcelas
  -- ──────────────────────────────────────────────────────────────────
  v_base := p_total_cents / p_num_installments;
  v_remainder := p_total_cents % p_num_installments;

  for v_i in 1..p_num_installments loop
    -- Adicionar 1 centavo nas primeiras parcelas (até acabar o resto)
    v_amount := v_base + case when v_i <= v_remainder then 1 else 0 end;

    -- Criar transação da parcela
    insert into public.transactions (
      id, 
      user_id, 
      type, 
      account_id, 
      card_id, 
      category_id,
      amount_cents, 
      occurred_at, 
      description, 
      transfer_group_id,
      installment_index, 
      installment_total, 
      created_at
    )
    values (
      gen_random_uuid(), 
      v_user, 
      'expense', 
      null,
      p_card_id, 
      p_category_id,
      v_amount, 
      (v_first + (v_i - 1) * interval '1 month')::date,
      p_description, 
      v_group,
      v_i,
      p_num_installments,
      now()
    )
    returning id into v_id;

    -- Adicionar ID ao array de retorno
    v_ids := array_append(v_ids, v_id);
  end loop;

  -- Retornar o grupo e os IDs criados
  return query select v_group, v_ids;
end;
$$;

-- Permissões da função canônica (apenas authenticated)
revoke all on function public.create_card_installments_v1(uuid, uuid, text, date, int, boolean, bigint) from public;
grant execute on function public.create_card_installments_v1(uuid, uuid, text, date, int, boolean, bigint) to authenticated;

comment on function public.create_card_installments_v1 is 
  'Função canônica (implementação real) para criar parcelas. Use os wrappers create_card_installments() ao invés de chamar diretamente.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) WRAPPER A - Total por ÚLTIMO (ordem usada pelo cliente atual)
-- ────────────────────────────────────────────────────────────────────────────
-- Assinatura: (card_id, category_id, description, first_date, num_installments, start_next_invoice, total_cents)
create or replace function public.create_card_installments(
  p_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_first_date date,
  p_num_installments int,
  p_start_next_invoice boolean,
  p_total_cents bigint
)
returns table (transfer_group_id uuid, created_ids uuid[])
language sql
security definer
as $$
  select * from public.create_card_installments_v1(
    p_card_id,
    p_category_id,
    p_description,
    p_first_date,
    p_num_installments,
    p_start_next_invoice,
    p_total_cents
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) WRAPPER B - Total ANTES da data (ordem alternativa)
-- ────────────────────────────────────────────────────────────────────────────
-- Assinatura: (card_id, category_id, description, total_cents, first_date, num_installments, start_next_invoice)
create or replace function public.create_card_installments(
  p_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_total_cents bigint,
  p_first_date date,
  p_num_installments int,
  p_start_next_invoice boolean
)
returns table (transfer_group_id uuid, created_ids uuid[])
language sql
security definer
as $$
  select * from public.create_card_installments_v1(
    p_card_id,
    p_category_id,
    p_description,
    p_first_date,
    p_num_installments,
    p_start_next_invoice,
    p_total_cents
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Permissões dos wrappers (ambas as assinaturas)
-- ────────────────────────────────────────────────────────────────────────────
revoke all on function public.create_card_installments(uuid, uuid, text, date, int, boolean, bigint) from public;
revoke all on function public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean) from public;

grant execute on function public.create_card_installments(uuid, uuid, text, date, int, boolean, bigint) to authenticated;
grant execute on function public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean) to authenticated;

comment on function public.create_card_installments(uuid, uuid, text, date, int, boolean, bigint) is 
  'Wrapper: Cria N parcelas de uma compra no cartão (total por último)';

comment on function public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean) is 
  'Wrapper: Cria N parcelas de uma compra no cartão (total antes da data)';

-- ────────────────────────────────────────────────────────────────────────────
-- 7) Verificação final (opcional)
-- ────────────────────────────────────────────────────────────────────────────
-- Descomentar para verificar as funções criadas:
/*
select
  n.nspname as schema,
  p.proname as name,
  oidvectortypes(p.proargtypes) as argtypes
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname like '%installment%'
order by p.proname, oidvectortypes(p.proargtypes);
*/




