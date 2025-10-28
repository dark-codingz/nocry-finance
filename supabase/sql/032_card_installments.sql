-- ============================================================================
-- 032_card_installments.sql - Sistema de Parcelamento de Compras no Cartão
-- ============================================================================
-- PROPÓSITO:
-- - Adicionar campos para controle de parcelas nas transações
-- - RPC para criar N parcelas de uma compra (1 até 12x)
-- - Distribuição inteligente do valor total (resto vai nas primeiras parcelas)
-- - Opção de começar na próxima fatura ou no mês atual
--
-- CAMPOS ADICIONADOS:
-- - installment_index: posição da parcela (1, 2, 3, ...)
-- - installment_total: total de parcelas (ex: 12 para 12x)
--
-- RPC:
-- - create_card_installments: cria N transações de uma vez, distribuídas mês a mês
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Adicionar campos para controle de parcelas (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists installment_index int,
  add column if not exists installment_total int;

-- Índices úteis para performance
create index if not exists idx_transactions_group 
  on public.transactions(transfer_group_id);

create index if not exists idx_transactions_card_install 
  on public.transactions(card_id, installment_index, installment_total);

-- Comentários para documentação
comment on column public.transactions.installment_index is 
  'Posição da parcela (1-based). Ex: 3 em "3/12"';

comment on column public.transactions.installment_total is 
  'Total de parcelas do grupo. Ex: 12 em "3/12"';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) RPC para criar parcelas de uma compra no cartão
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.create_card_installments(
  p_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_total_cents bigint,
  p_first_date date,                  -- data base da 1ª parcela
  p_num_installments int,             -- 1..12
  p_start_next_invoice boolean        -- se true, empurra a 1ª para o próximo ciclo
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
  v_date date;
  v_card record;
  v_first date;
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
  -- Divisão inteira + resto
  v_base := p_total_cents / p_num_installments;
  v_remainder := p_total_cents % p_num_installments;
  
  -- O resto (centavos) vai para as primeiras parcelas
  -- Ex: R$ 100,00 em 3x = R$ 33,34 + R$ 33,33 + R$ 33,33
  
  for v_i in 1..p_num_installments loop
    -- Adicionar 1 centavo nas primeiras parcelas (até acabar o resto)
    v_amount := v_base + case when v_i <= v_remainder then 1 else 0 end;

    -- Calcular data da parcela (1 mês a mais a cada iteração)
    v_date := (v_first + (v_i - 1) * interval '1 month')::date;

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
      null,                 -- compra no cartão não tem conta
      p_card_id, 
      p_category_id,
      v_amount, 
      v_date, 
      p_description, 
      v_group,
      v_i,                  -- índice da parcela (1, 2, 3, ...)
      p_num_installments,   -- total de parcelas
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

-- Remover permissões públicas (segurança)
revoke all on function public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean) from public;

-- Conceder acesso apenas para usuários autenticados
grant execute on function public.create_card_installments(uuid, uuid, text, bigint, date, int, boolean) to authenticated;

-- Comentário na função
comment on function public.create_card_installments is 
  'Cria N parcelas de uma compra no cartão, distribuídas mês a mês. O valor total é dividido igualmente, com o resto (centavos) indo para as primeiras parcelas.';




