// ============================================================================
// hooks/analytics/useFlowData.ts - Hook para Flow & Tendências
// ============================================================================
// PROPÓSITO:
// - Buscar dados de flow (séries temporais) via React Query
// - Suporta modo CAIXA e COMPETÊNCIA
// - Cache de 5 minutos
//
// USO:
// const { data, isLoading, error } = useFlowData(filters);
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCacheKey, type AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { getFlowData } from '@/services/analytics/flow';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useFlowData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('flow', filters),
    queryFn: () => getFlowData(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!filters.userId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

