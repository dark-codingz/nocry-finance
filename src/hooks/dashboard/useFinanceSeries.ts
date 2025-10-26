"use client";

// ============================================================================
// useFinanceSeries - Hook para série temporal de saldo financeiro
// ============================================================================
// Propósito: Gerar série diária de saldo acumulado para gráfico de área.
//
// COMO FUNCIONA:
// 1. Busca todas as transactions do período [from, to]
// 2. Gera array com todas as datas do intervalo (loop de dias)
// 3. Para cada dia:
//    - Soma receitas (type='income') até aquele dia (acumulado)
//    - Soma despesas (type='expense') até aquele dia (acumulado)
//    - Soma fixas lançadas até aquele dia (description LIKE '[FIXA]%')
//    - Saldo = receitas - despesas - fixas
// 4. Retorna array: [{ dateISO: 'YYYY-MM-DD', balanceCents: number }]
//
// PERFORMANCE:
// - Query única para buscar todas as transactions do período
// - Processamento client-side (loop de dias + acumulação)
// - Cache via TanStack Query (staleTime: 60s)
//
// EVOLUÇÃO FUTURA:
// - Mover cálculo para RPC (Postgres function) se o período for muito longo
// - Adicionar métricas extras (gastos por categoria, etc.)
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

// ============================================================================
// Tipos
// ============================================================================

export interface FinanceSeriesDataPoint {
  dateISO: string; // YYYY-MM-DD
  balanceCents: number; // Saldo acumulado até aquele dia (em centavos)
}

interface UseFinanceSeriesParams {
  userId: string | null;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// ============================================================================
// Função de Serviço (busca + agregação)
// ============================================================================

async function fetchFinanceSeries(
  supabase: any,
  userId: string,
  from: string,
  to: string
): Promise<FinanceSeriesDataPoint[]> {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Busca todas as transactions do período (exceto transferências)
  // ─────────────────────────────────────────────────────────────────────
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('occurred_at, type, amount_cents, description')
    .eq('user_id', userId)
    .in('type', ['income', 'expense'])
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .order('occurred_at', { ascending: true });

  if (error) throw error;

  // ─────────────────────────────────────────────────────────────────────
  // 2. Gera array de todas as datas do intervalo
  // ─────────────────────────────────────────────────────────────────────
  const startDate = dayjs(from);
  const endDate = dayjs(to);
  const daysCount = endDate.diff(startDate, 'day') + 1;

  const series: FinanceSeriesDataPoint[] = [];

  // ─────────────────────────────────────────────────────────────────────
  // 3. Para cada dia, calcula saldo acumulado
  // ─────────────────────────────────────────────────────────────────────
  let accumulatedIncomeCents = 0;
  let accumulatedExpenseCents = 0;

  for (let i = 0; i < daysCount; i++) {
    const currentDate = startDate.add(i, 'day');
    const dateISO = currentDate.format('YYYY-MM-DD');

    // Filtra transactions até o dia atual (inclusivo)
    const transactionsUntilToday = (transactions || []).filter(
      (t: any) => dayjs(t.occurred_at).isSameOrBefore(currentDate, 'day')
    );

    // Acumula receitas e despesas
    accumulatedIncomeCents = transactionsUntilToday
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount_cents, 0);

    accumulatedExpenseCents = transactionsUntilToday
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount_cents, 0);

    // Saldo = receitas - despesas
    const balanceCents = accumulatedIncomeCents - accumulatedExpenseCents;

    series.push({ dateISO, balanceCents });
  }

  return series;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useFinanceSeries({ userId, from, to }: UseFinanceSeriesParams) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['finance-series', userId, from, to],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return fetchFinanceSeries(supabase, userId, from, to);
    },
    enabled: !!userId && !!from && !!to,
    staleTime: 1000 * 60, // 60 segundos
    refetchOnWindowFocus: false,
    initialData: [],
  });
}




