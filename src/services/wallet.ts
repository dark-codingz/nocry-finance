// ============================================================================
// Services: Wallet (Carteira)
// ============================================================================
// PROPÓSITO:
// - Listar contas, cartões e transações
// - Filtros básicos por data e busca
// - Base para operações da carteira
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
export type Account = {
  id: string;
  name: string | null;
  type?: string | null;
  balance_cents?: number;
  created_at?: string;
};

export type Card = {
  id: string;
  name: string | null;
  closing_day?: number | null;
  due_day?: number | null;
  limit_cents?: number | null;
  created_at?: string;
};

export type Tx = {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  description: string | null;
  amount_cents: number;
  occurred_at: string; // YYYY-MM-DD
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  created_at?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// listAccounts - Lista todas as contas do usuário
// ────────────────────────────────────────────────────────────────────────────
export async function listAccounts() {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Account[];
}

// ────────────────────────────────────────────────────────────────────────────
// listCards - Lista todos os cartões do usuário
// ────────────────────────────────────────────────────────────────────────────
export async function listCards() {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Card[];
}

// ────────────────────────────────────────────────────────────────────────────
// listTransactions - Lista transações com filtros
// ────────────────────────────────────────────────────────────────────────────
export async function listTransactions(params: {
  date_from?: string; // "YYYY-MM-DD"
  date_to?: string; // "YYYY-MM-DD"
  q?: string; // Busca por descrição
  limit?: number;
}) {
  const supabase = createSupabaseBrowser();

  let query = supabase
    .from('transactions')
    .select(
      'id,type,description,amount_cents,occurred_at,account_id,card_id,category_id,created_at'
    )
    .order('occurred_at', { ascending: false })
    .limit(params.limit ?? 100);

  // Filtros opcionais
  if (params.date_from) {
    query = query.gte('occurred_at', params.date_from);
  }
  if (params.date_to) {
    query = query.lte('occurred_at', params.date_to);
  }
  if (params.q && params.q.trim()) {
    query = query.ilike('description', `%${params.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Tx[];
}

