// ============================================================================
// Hooks: Transações (React Query)
// ============================================================================
// PROPÓSITO:
// - Hooks para gerenciar transações com filtros avançados
// - Paginação server-side (25 itens por página)
// - Totalizadores do período (entradas, saídas, saldo)
// - Mutations: Delete, Toggle Reconciled
//
// FEATURES:
// - Filtros: Período, Tipo, Conta, Cartão, Categoria, Busca
// - Joins com accounts, cards, categories
// - Invalidação automática de caches relacionados
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
export type TxKind = 'expense' | 'income' | 'transfer';

export type TxRow = {
  id: string;
  type: TxKind;
  amount_cents: number;
  occurred_at: string; // YYYY-MM-DD
  description: string | null;
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  transfer_group_id?: string | null;
  reconciled?: boolean | null;
  created_at?: string;

  // Parcelamento
  installment_index?: number | null;
  installment_total?: number | null;

  // Joins
  account?: { id: string; name: string } | null;
  card?: { id: string; name: string } | null;
  category?: { id: string; name: string; type: 'expense' | 'income' } | null;
};

export type TxFilters = {
  from: string;
  to: string;
  kind?: 'all' | TxKind;
  accountId?: string | null;
  cardId?: string | null;
  categoryId?: string | null;
  q?: string;
  page?: number; // 1-based
  pageSize?: number; // default 25
};

export type TxQueryResult = {
  rows: TxRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: {
    expense_cents: number;
    income_cents: number;
    net_cents: number;
  };
};

// ────────────────────────────────────────────────────────────────────────────
// useTransactions - Lista com filtros e paginação
// ────────────────────────────────────────────────────────────────────────────
export function useTransactions(filters: TxFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ['transactions', { ...filters, page, pageSize }],
    queryFn: async (): Promise<TxQueryResult> => {
      const supabase = createClientComponentClient();

      // ──────────────────────────────────────────────────────────────
      // Query principal (lista paginada com joins)
      // ──────────────────────────────────────────────────────────────
      let query = supabase
        .from('transactions')
        .select(
          `
          id, type, amount_cents, occurred_at, description, 
          account_id, card_id, category_id, transfer_group_id, reconciled, created_at,
          installment_index, installment_total,
          account:accounts!transactions_account_id_fkey ( id, name ),
          card:cards!transactions_card_id_fkey ( id, name ),
          category:categories!transactions_category_id_fkey ( id, name, type )
        `,
          { count: 'exact' }
        )
        .gte('occurred_at', filters.from)
        .lte('occurred_at', filters.to)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false });

      // Filtro por tipo
      if (filters.kind && filters.kind !== 'all') {
        query = query.eq('type', filters.kind);
      }

      // Filtro por conta
      if (filters.accountId) {
        query = query.eq('account_id', filters.accountId);
      }

      // Filtro por cartão
      if (filters.cardId) {
        query = query.eq('card_id', filters.cardId);
      }

      // Filtro por categoria
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      // Busca por descrição
      if (filters.q && filters.q.trim()) {
        const searchTerm = `%${filters.q.trim()}%`;
        query = query.ilike('description', searchTerm);
      }

      // Paginação
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // ──────────────────────────────────────────────────────────────
      // Totalizadores do período (sem paginação)
      // ──────────────────────────────────────────────────────────────
      const baseQuery = supabase
        .from('transactions')
        .select('amount_cents, type', { head: false, count: 'exact' })
        .gte('occurred_at', filters.from)
        .lte('occurred_at', filters.to);

      // Aplicar mesmos filtros dos totais
      let expenseQuery = baseQuery.eq('type', 'expense');
      let incomeQuery = baseQuery.eq('type', 'income');

      if (filters.accountId) {
        expenseQuery = expenseQuery.eq('account_id', filters.accountId);
        incomeQuery = incomeQuery.eq('account_id', filters.accountId);
      }
      if (filters.cardId) {
        expenseQuery = expenseQuery.eq('card_id', filters.cardId);
        incomeQuery = incomeQuery.eq('card_id', filters.cardId);
      }
      if (filters.categoryId) {
        expenseQuery = expenseQuery.eq('category_id', filters.categoryId);
        incomeQuery = incomeQuery.eq('category_id', filters.categoryId);
      }
      if (filters.q && filters.q.trim()) {
        const searchTerm = `%${filters.q.trim()}%`;
        expenseQuery = expenseQuery.ilike('description', searchTerm);
        incomeQuery = incomeQuery.ilike('description', searchTerm);
      }

      const [expenseResult, incomeResult] = await Promise.all([
        expenseQuery,
        incomeQuery,
      ]);

      const totalExpense = (expenseResult.data ?? []).reduce(
        (acc, r) => acc + ((r as { amount_cents: number }).amount_cents || 0),
        0
      );
      const totalIncome = (incomeResult.data ?? []).reduce(
        (acc, r) => acc + ((r as { amount_cents: number }).amount_cents || 0),
        0
      );

      return {
        rows: (data ?? []) as unknown as TxRow[],
        total: count ?? 0,
        page,
        pageSize,
        totals: {
          expense_cents: totalExpense,
          income_cents: totalIncome,
          net_cents: totalIncome - totalExpense,
        },
      };
    },
    staleTime: 10_000, // Cache por 10 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useDeleteTransaction - Excluir transação
// ────────────────────────────────────────────────────────────────────────────
export function useDeleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClientComponentClient();

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-kpis'] });
      qc.invalidateQueries({ queryKey: ['card-invoice-current'] });
      qc.invalidateQueries({ queryKey: ['recent-finance'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useToggleReconciled - Toggle reconciliação
// ────────────────────────────────────────────────────────────────────────────
export function useToggleReconciled() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const supabase = createClientComponentClient();

      const { error } = await supabase
        .from('transactions')
        .update({ reconciled: value })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar apenas queries de transações
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

