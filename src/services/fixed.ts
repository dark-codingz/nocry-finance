// ============================================================================
// Services: Contas Fixas (CRUD)
// ============================================================================
// PROPÓSITO:
// - Gerenciar despesas/receitas recorrentes mensais
// - Operações: Listar, Criar, Editar, Ativar/Desativar, Excluir
// - Lançamento mensal via RPC
//
// NOTA:
// - due_day: 1-28 (evita problemas com meses variáveis)
// - active: indica se deve ser lançada automaticamente
// - RLS garante que usuário só vê suas próprias contas fixas
// ============================================================================

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type FixedItem = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount_cents: number;
  due_day: number; // 1..28
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  active: boolean;
  created_at?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// listFixed - Lista contas fixas (com filtros)
// ────────────────────────────────────────────────────────────────────────────
export async function listFixed(opts?: {
  q?: string;
  type?: 'all' | 'expense' | 'income';
  active?: 'all' | 'active' | 'inactive';
}) {
  const supabase = createClientComponentClient();

  let query = supabase
    .from('fixed_bills')
    .select(
      'id, name, type, amount_cents, day_of_month, account_id, card_id, category_id, is_active, created_at'
    )
    .order('day_of_month', { ascending: true })
    .order('name', { ascending: true });

  // Filtro por tipo
  if (opts?.type && opts.type !== 'all') {
    query = query.eq('type', opts.type);
  }

  // Filtro por status ativo/inativo
  if (opts?.active === 'active') {
    query = query.eq('is_active', true);
  } else if (opts?.active === 'inactive') {
    query = query.eq('is_active', false);
  }

  // Busca por nome
  if (opts?.q && opts.q.trim()) {
    query = query.ilike('name', `%${opts.q.trim()}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Mapear day_of_month para due_day e is_active para active
  return ((data ?? []) as any[]).map((item) => ({
    ...item,
    due_day: item.day_of_month,
    active: item.is_active,
  })) as FixedItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// createFixed - Cria nova conta fixa
// ────────────────────────────────────────────────────────────────────────────
export async function createFixed(
  input: Omit<FixedItem, 'id' | 'created_at' | 'active'> & { active?: boolean }
) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from('fixed_bills')
    .insert({
      name: input.name,
      type: input.type,
      amount_cents: input.amount_cents,
      day_of_month: input.due_day,
      account_id: input.account_id ?? null,
      card_id: input.card_id ?? null,
      category_id: input.category_id ?? null,
      is_active: input.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;

  // Mapear day_of_month para due_day e is_active para active
  return {
    ...(data as any),
    due_day: (data as any).day_of_month,
    active: (data as any).is_active,
  } as FixedItem;
}

// ────────────────────────────────────────────────────────────────────────────
// updateFixed - Atualiza conta fixa existente
// ────────────────────────────────────────────────────────────────────────────
export async function updateFixed(
  id: string,
  input: Partial<Omit<FixedItem, 'id' | 'created_at'>>
) {
  const supabase = createClientComponentClient();

  // Mapear due_day para day_of_month e active para is_active
  const mapped: any = { ...input };
  if ('due_day' in input) {
    mapped.day_of_month = input.due_day;
    delete mapped.due_day;
  }
  if ('active' in input) {
    mapped.is_active = input.active;
    delete mapped.active;
  }

  const { data, error } = await supabase
    .from('fixed_bills')
    .update(mapped)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Mapear de volta
  return {
    ...(data as any),
    due_day: (data as any).day_of_month,
    active: (data as any).is_active,
  } as FixedItem;
}

// ────────────────────────────────────────────────────────────────────────────
// toggleActive - Ativa/desativa conta fixa
// ────────────────────────────────────────────────────────────────────────────
export async function toggleActive(id: string, active: boolean) {
  const supabase = createClientComponentClient();

  const { error } = await supabase
    .from('fixed_bills')
    .update({ is_active: active })
    .eq('id', id);

  if (error) throw error;
}

// ────────────────────────────────────────────────────────────────────────────
// removeFixed - Remove conta fixa
// ────────────────────────────────────────────────────────────────────────────
export async function removeFixed(id: string) {
  const supabase = createClientComponentClient();

  const { error } = await supabase.from('fixed_bills').delete().eq('id', id);

  if (error) throw error;
}

// ────────────────────────────────────────────────────────────────────────────
// launchFixedForMonth - Lança contas fixas do mês via RPC
// ────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Cria transações para todas as contas fixas ativas do mês
// IDEMPOTENTE: Não cria duplicatas se já foram lançadas
// ────────────────────────────────────────────────────────────────────────────
export async function launchFixedForMonth(opts: { monthISO: string }) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase.rpc('launch_fixed_for_month', {
    p_month: opts.monthISO,
  });

  if (error) throw error;
  return data;
}

