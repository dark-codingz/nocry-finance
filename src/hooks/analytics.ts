// ============================================================================
// analytics.ts - Hooks para Analytics
// ============================================================================
// PROPÓSITO:
// - React Query hooks para séries temporais
// - Cache e invalidação automática
// - Loading states e error handling
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getPfMonthlySeries, PfMonthlyRow, getNetByPeriod, NetByPeriodRow } from '@/services/analytics';

// ────────────────────────────────────────────────────────────────────────────
// Hook: Série Mensal de Finanças Pessoais
// ────────────────────────────────────────────────────────────────────────────
/**
 * Hook para buscar série mensal de receitas, despesas e líquido.
 * 
 * @param monthsBack - Quantos meses para trás (default: 12)
 * @returns React Query result com array de dados mensais
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = usePfMonthlySeries(12);
 * ```
 */
export function usePfMonthlySeries(monthsBack: number = 12) {
  return useQuery<PfMonthlyRow[]>({
    queryKey: ['pf-monthly-series', monthsBack],
    queryFn: () => getPfMonthlySeries(monthsBack),
    staleTime: 15_000, // 15 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Hook: Saldo Líquido por Período (Filtrado)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Hook para buscar receitas, despesas e líquido em um período específico.
 * Usado para o card "Saldo Líquido" do Dashboard com filtro de datas.
 * 
 * @param date_from - Data inicial (YYYY-MM-DD)
 * @param date_to - Data final (YYYY-MM-DD)
 * @returns React Query result com totais do período
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useNetByPeriod('2025-01-01', '2025-01-31');
 * ```
 */
export function useNetByPeriod(date_from: string, date_to: string) {
  return useQuery<NetByPeriodRow>({
    queryKey: ['pf-net-by-period', date_from, date_to],
    queryFn: () => getNetByPeriod(date_from, date_to),
    enabled: Boolean(date_from && date_to),
    staleTime: 10_000, // 10 segundos
  });
}

