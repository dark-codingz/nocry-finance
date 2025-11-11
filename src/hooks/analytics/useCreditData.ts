// ============================================================================
// hooks/analytics/useCreditData.ts - Hook para Crédito & Faturas
// ============================================================================
// PROPÓSITO:
// - Buscar dados de crédito via React Query
// - Utilização por cartão e agregada
// - Cache de 5 minutos
//
// USO:
// const { data, isLoading, error } = useCreditData(filters);
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCacheKey, type AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { getCreditData } from '@/services/analytics/credit';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useCreditData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('credit', filters),
    queryFn: () => getCreditData(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!filters.userId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

