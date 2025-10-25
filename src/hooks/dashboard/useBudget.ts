// ============================================================================
// useBudget - Hook para Orçamento do Mês
// ============================================================================
// Propósito: Buscar orçamento definido e calcular % usado.
//
// ORIGEM DOS DADOS:
// - Tabela: budgets (month, amount_cents)
// - Tabela: transactions (para calcular gasto do mês)
//
// CÁLCULOS:
// - totalCents: budget.amount_cents
// - usedCents: Soma de transactions.type='expense' no período
// - remainingCents: totalCents - usedCents
// - percentUsed: (usedCents / totalCents) * 100
//
// RETORNO:
// - null se não houver orçamento definido
// - { totalCents, usedCents, remainingCents, percentUsed } se houver
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

interface BudgetParams {
  month: string; // YYYY-MM
  from: string;  // ISO date (YYYY-MM-DD)
  to: string;    // ISO date (YYYY-MM-DD)
  userId: string;
}

interface Budget {
  totalCents: number;
  usedCents: number;
  remainingCents: number;
  percentUsed: number;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useBudget(params: BudgetParams) {
  const supabase = useSupabaseClient();

  return useQuery({
    // ⚠️ IMPORTANTE: Key deve ser ['budget', monthKey] para invalidação
    queryKey: ['budget', params.month],
    queryFn: async (): Promise<Budget | null> => {
      // ─────────────────────────────────────────────────────────────────
      // 1. Buscar orçamento definido para o mês (usando month_key)
      // ─────────────────────────────────────────────────────────────────
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('amount_cents')
        .eq('month_key', params.month) // ✅ Usa month_key (texto YYYY-MM)
        .maybeSingle();

      if (budgetError) throw budgetError;
      if (!budget) return null; // Orçamento não definido

      // ─────────────────────────────────────────────────────────────────
      // 2. Calcular quanto foi gasto no período
      // ─────────────────────────────────────────────────────────────────
      const { data: expenses, error: expensesError } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('type', 'expense')
        .gte('occurred_at', params.from)
        .lte('occurred_at', params.to);

      if (expensesError) throw expensesError;

      const usedCents = expenses?.reduce((sum, tx) => sum + tx.amount_cents, 0) || 0;

      // ─────────────────────────────────────────────────────────────────
      // 3. Calcular métricas (com proteções contra valores inválidos)
      // ─────────────────────────────────────────────────────────────────
      const totalCents = typeof budget.amount_cents === 'number' ? budget.amount_cents : 0;
      const safeTotalCents = Math.max(0, totalCents); // Nunca negativo
      const safeUsedCents = Math.max(0, usedCents);   // Nunca negativo
      
      const remainingCents = Math.max(0, safeTotalCents - safeUsedCents);
      const percentUsed = safeTotalCents > 0 
        ? Math.min(100, (safeUsedCents / safeTotalCents) * 100) 
        : 0;

      return {
        totalCents: safeTotalCents,
        usedCents: safeUsedCents,
        remainingCents,
        percentUsed, // Sempre entre 0-100
      };
    },
    staleTime: 0, // ✅ Sem cache - sempre busca dados atualizados
    enabled: !!params.userId && !!params.month,
  });
}


