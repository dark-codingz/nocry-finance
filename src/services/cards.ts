// ============================================================================
// Services: Cartões (CRUD + Faturas)
// ============================================================================
// PROPÓSITO:
// - Gerenciar cartões de crédito
// - Operações: Listar, Criar, Editar, Arquivar (soft delete)
// - Consultar faturas atuais e detalhes
//
// NOTA:
// - Usa soft delete (archived=true) ao invés de hard delete
// - Cartões arquivados são filtrados por padrão
// - RLS garante que usuário só vê seus próprios cartões
// - Faturas são calculadas via view card_invoices_current
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

export type Card = {
  id: string;
  name: string;
  closing_day: number; // 1..28
  due_day: number; // 1..28
  limit_cents?: number | null;
  archived?: boolean | null;
  created_at?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// listCards - Lista cartões (com filtros)
// ────────────────────────────────────────────────────────────────────────────
export async function listCards(opts?: { q?: string }) {
  const supabase = createSupabaseBrowser();

  let query = supabase
    .from('cards')
    .select('id, name, closing_day, due_day, limit_cents, archived')
    .or('archived.is.null,archived.eq.false') // Ignorar arquivados
    .order('name');

  // Filtro por nome (busca)
  if (opts?.q) {
    query = query.ilike('name', `%${opts.q}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Card[];
}

// ────────────────────────────────────────────────────────────────────────────
// createCard - Cria novo cartão
// ────────────────────────────────────────────────────────────────────────────
export async function createCard(input: {
  name: string;
  closing_day: number;
  due_day: number;
  limit_cents?: number | null;
}) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase
    .from('cards')
    .insert({
      name: input.name,
      closing_day: input.closing_day,
      due_day: input.due_day,
      limit_cents: input.limit_cents ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

// ────────────────────────────────────────────────────────────────────────────
// updateCard - Atualiza cartão existente
// ────────────────────────────────────────────────────────────────────────────
export async function updateCard(
  id: string,
  input: {
    name: string;
    closing_day: number;
    due_day: number;
    limit_cents?: number | null;
  }
) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase
    .from('cards')
    .update({
      name: input.name,
      closing_day: input.closing_day,
      due_day: input.due_day,
      limit_cents: input.limit_cents ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

// ────────────────────────────────────────────────────────────────────────────
// deleteOrArchiveCard - Arquiva cartão (soft delete)
// ────────────────────────────────────────────────────────────────────────────
export async function deleteOrArchiveCard(id: string) {
  const supabase = createSupabaseBrowser();

  // Soft delete: marca como arquivado
  const { error: upErr } = await supabase
    .from('cards')
    .update({ archived: true })
    .eq('id', id);

  if (!upErr) return { archived: true };

  // Fallback: hard delete (se não houver coluna archived)
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) throw error;
  return { deleted: true };
}

// ────────────────────────────────────────────────────────────────────────────
// FATURAS: Consulta view card_invoices_current
// ────────────────────────────────────────────────────────────────────────────

/** Fatura atual de um cartão COM saldo aberto (charges - payments) */
export type CardInvoice = {
  card_id: string;
  card_name: string;
  cycle_start: string; // date YYYY-MM-DD
  cycle_end: string; // date YYYY-MM-DD
  total_charges_cents: number; // Total de compras
  total_payments_cents: number; // Total de pagamentos
  balance_cents: number; // Saldo aberto (charges - payments)
  amount_cents: number; // Alias para balance_cents (compatibilidade)
  due_date: string; // date YYYY-MM-DD
  days_to_due: number | null;
};

export async function listCurrentInvoices() {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase
    .from('card_invoices_with_payments')
    .select('*');

  if (error) throw error;
  
  // Mapear balance_cents para amount_cents (compatibilidade)
  return (data ?? []).map(inv => ({
    ...inv,
    amount_cents: inv.balance_cents,
  })) as CardInvoice[];
}

// ────────────────────────────────────────────────────────────────────────────
// listCurrentInvoiceTransactions - Detalhes da fatura atual (transações)
// ────────────────────────────────────────────────────────────────────────────
export async function listCurrentInvoiceTransactions(card_id: string) {
  const supabase = createSupabaseBrowser();

  // 1) Buscar período do cartão na view
  const { data: period, error: e1 } = await supabase
    .from('card_invoices_current')
    .select('cycle_start, cycle_end, card_name')
    .eq('card_id', card_id)
    .single();

  if (e1) throw e1;

  // 2) Buscar transações (compras) nesse intervalo
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, occurred_at, description, amount_cents, category:categories(name)'
    )
    .eq('card_id', card_id)
    .eq('type', 'expense')
    .gte('occurred_at', period.cycle_start)
    .lte('occurred_at', period.cycle_end)
    .order('occurred_at', { ascending: false });

  if (error) throw error;

  return {
    card_name: period.card_name,
    cycle_start: period.cycle_start,
    cycle_end: period.cycle_end,
    rows: data ?? [],
  };
}

