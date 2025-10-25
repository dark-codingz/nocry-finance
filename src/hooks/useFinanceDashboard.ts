// /src/hooks/useFinanceDashboard.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import * as financeDashboardService from '@/services/financeDashboard';
import { EMPTY_FINANCE_DATA, type FinanceDashboardData } from '@/types/financeDashboard';

/**
 * Hook para buscar todos os dados agregados para o dashboard financeiro.
 * A chamada do hook é incondicional; a query interna é desativada se não houver usuário.
 */
export function useFinanceDashboard(month: string): {
    data: FinanceDashboardData;
    isLoading: boolean;
    error: unknown;
} {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;

    const query = useQuery({
        queryKey: ['finance-dashboard', userId, month],
        enabled: !!userId && !!month,
        initialData: EMPTY_FINANCE_DATA,
        queryFn: async (): Promise<FinanceDashboardData> => {
            // `enabled` garante que userId não será nulo aqui.
            const [summary, invoices, nextBill] = await Promise.all([
                financeDashboardService.getPFMonthSummary(supabase, userId!, month),
                financeDashboardService.getCurrentInvoices(supabase, userId!),
                financeDashboardService.getNextFixedBill(supabase, userId!),
            ]);
            return { summary, invoices, nextBill };
        },
        staleTime: 1000 * 60 * 5, // Cache de 5 minutos
        refetchOnWindowFocus: true,
    });

    return {
        data: query.data ?? EMPTY_FINANCE_DATA,
        isLoading: query.isLoading,
        error: query.error,
    };
}
