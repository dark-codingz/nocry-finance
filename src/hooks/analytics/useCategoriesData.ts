// ============================================================================
// hooks/analytics/useCategoriesData.ts - Hook para Categorias & Pareto
// ============================================================================
// PROPÓSITO:
// - Buscar dados de categorias via React Query
// - Pareto 80/20
// - Comparação com orçamento
// - Cache de 5 minutos
//
// USO:
// const { data, isLoading, error } = useCategoriesData(filters);
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCacheKey, type AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { getCategoriesData } from '@/services/analytics/categories';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useCategoriesData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('categories', filters),
    queryFn: () => getCategoriesData(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!filters.userId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

