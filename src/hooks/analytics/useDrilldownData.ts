// ============================================================================
// hooks/analytics/useDrilldownData.ts - Hook para Drill-down (Tabela Dinâmica)
// ============================================================================
// PROPÓSITO:
// - Buscar dados de drill-down via React Query
// - Agrupamento dinâmico
// - Paginação
// - Cache de 2 minutos (mais curto por ser interativo)
//
// USO:
// const { data, isLoading, error } = useDrilldownData(params);
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCacheKey } from '@/lib/analytics/cache-keys';
import { getDrilldownData, type DrilldownParams, type DrilldownData } from '@/services/analytics/drilldown';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useDrilldownData(params: DrilldownParams) {
  return useQuery<DrilldownData>({
    queryKey: [
      ...getCacheKey('drilldown', params.filters),
      params.groupBy,
      params.page,
      params.pageSize,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () => getDrilldownData(params),
    staleTime: 1000 * 60 * 2, // 2 minutos (mais curto por ser interativo)
    enabled: !!params.filters.userId,
    retry: 2,
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Mantém dados anteriores durante paginação
  });
}

