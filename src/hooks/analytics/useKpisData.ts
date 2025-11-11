// ============================================================================
// hooks/analytics/useKpisData.ts - Hook para KPIs de Saúde
// ============================================================================
// PROPÓSITO:
// - Buscar KPIs de saúde financeira via React Query
// - Cache de 5 minutos
// - Invalidação automática via cache keys
//
// USO:
// const { data, isLoading, error } = useKpisData(filters);
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCacheKey, type AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { getHealthKpis } from '@/services/analytics/kpis';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useKpisData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('kpis', filters),
    queryFn: () => getHealthKpis(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!filters.userId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

