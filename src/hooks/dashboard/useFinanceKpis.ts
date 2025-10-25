// ============================================================================
// useFinanceKpis - Hook para KPIs Financeiros
// ============================================================================
// Propósito: Buscar indicadores financeiros principais (SDM, Entradas, Saídas).
//
// ORIGEM DOS DADOS:
// - Tabela: transactions
// - Filtros: occurred_at BETWEEN from AND to, type IN ('income', 'expense')
//
// CÁLCULOS:
// - incomeCents: Soma de transactions.amount_cents WHERE type='income'
// - expenseCents: Soma de transactions.amount_cents WHERE type='expense'
// - fixedCents: Soma de fixed_bills lançadas no período (via description '[FIXA]')
// - sdmCents: incomeCents - expenseCents - fixedCents
//
// PRÓXIMOS PASSOS:
// - Conectar ao filtro de data do Header (context)
// ============================================================================

"use client";

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// ============================================================================
// Tipos
// ============================================================================

interface FinanceKpisParams {
  from: string; // ISO date (YYYY-MM-DD)
  to: string;   // ISO date (YYYY-MM-DD)
  userId: string;
}

interface FinanceKpis {
  incomeCents: number;
  expenseCents: number;
  fixedCents: number;
  sdmCents: number;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useFinanceKpis(params: FinanceKpisParams) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['finance-kpis', params.from, params.to, params.userId],
    queryFn: async (): Promise<FinanceKpis> => {
      // ─────────────────────────────────────────────────────────────────
      // 1. Buscar receitas (income) e despesas (expense) do período
      // ─────────────────────────────────────────────────────────────────
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount_cents, description')
        .eq('user_id', params.userId)
        .gte('occurred_at', params.from)
        .lte('occurred_at', params.to)
        .in('type', ['income', 'expense']);

      if (error) throw error;

      // ─────────────────────────────────────────────────────────────────
      // 2. Agregar valores
      // ─────────────────────────────────────────────────────────────────
      let incomeCents = 0;
      let expenseCents = 0;
      let fixedCents = 0;

      transactions?.forEach((tx) => {
        if (tx.type === 'income') {
          incomeCents += tx.amount_cents;
        } else if (tx.type === 'expense') {
          expenseCents += tx.amount_cents;
          
          // Detectar contas fixas lançadas (description começa com '[FIXA]')
          if (tx.description?.startsWith('[FIXA]')) {
            fixedCents += tx.amount_cents;
          }
        }
      });

      // ─────────────────────────────────────────────────────────────────
      // 3. Calcular SDM (Saldo Disponível no Mês)
      // ─────────────────────────────────────────────────────────────────
      const sdmCents = incomeCents - expenseCents - fixedCents;

      return {
        incomeCents,
        expenseCents,
        fixedCents,
        sdmCents,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!params.userId && !!params.from && !!params.to,
  });
}




