// ============================================================================
// hooks/analytics/useAnalyticsFilters.ts - Hook para Filtros Globais
// ============================================================================
// PROPÓSITO:
// - Gerenciar filtros globais de analytics
// - Sincronizar com URL (searchParams)
// - Permitir alteração de filtros (modo, período, contas, etc.)
//
// USO:
// const { filters, setFilters, resetFilters } = useAnalyticsFilters();
// ============================================================================

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import {
  type AnalyticsFilters,
  type AnalyticsMode,
  type AnalyticsPeriod,
  getDefaultFilters,
  deserializeFilters,
  serializeFilters,
  getLast3MonthsRange,
  getYTDRange,
} from '@/lib/analytics/cache-keys';

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useUser();
  const userId = session?.id || '';

  // ──────────────────────────────────────────────────────────────────────
  // 1. Deserializar filtros da URL (ou usar defaults)
  // ──────────────────────────────────────────────────────────────────────
  const filters = useMemo(() => {
    if (!userId) return getDefaultFilters('');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const from = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const defaults = {
      mode: 'cash' as AnalyticsMode,
      dateRange: {
        from,
        to,
        period: 'month' as AnalyticsPeriod,
      },
    };

    return deserializeFilters(searchParams, userId, defaults);
  }, [searchParams, userId]);

  // ──────────────────────────────────────────────────────────────────────
  // 2. Atualizar filtros (e URL)
  // ──────────────────────────────────────────────────────────────────────
  const setFilters = useCallback(
    (updates: Partial<AnalyticsFilters>) => {
      const updated = { ...filters, ...updates };
      const params = serializeFilters(updated);
      router.push(`/analytics?${params.toString()}`);
    },
    [filters, router]
  );

  // ──────────────────────────────────────────────────────────────────────
  // 3. Helpers para alterar filtros específicos
  // ──────────────────────────────────────────────────────────────────────

  const setMode = useCallback(
    (mode: AnalyticsMode) => {
      setFilters({ mode });
    },
    [setFilters]
  );

  const setPeriod = useCallback(
    (period: AnalyticsPeriod) => {
      let from: string;
      let to: string;

      switch (period) {
        case 'month':
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          from = `${year}-${month}-01`;
          const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
          to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          break;

        case '3m':
          const range3m = getLast3MonthsRange();
          from = range3m.from;
          to = range3m.to;
          break;

        case 'ytd':
          const rangeYtd = getYTDRange();
          from = rangeYtd.from;
          to = rangeYtd.to;
          break;

        case 'custom':
          // Não altera from/to, apenas marca como custom
          from = filters.dateRange.from;
          to = filters.dateRange.to;
          break;
      }

      setFilters({
        dateRange: { from, to, period },
      });
    },
    [filters, setFilters]
  );

  const setDateRange = useCallback(
    (from: string, to: string) => {
      setFilters({
        dateRange: { from, to, period: 'custom' },
      });
    },
    [setFilters]
  );

  const setAccounts = useCallback(
    (accounts: string[]) => {
      setFilters({ accounts });
    },
    [setFilters]
  );

  const setCards = useCallback(
    (cards: string[]) => {
      setFilters({ cards });
    },
    [setFilters]
  );

  const setCategories = useCallback(
    (categories: string[]) => {
      setFilters({ categories });
    },
    [setFilters]
  );

  // ──────────────────────────────────────────────────────────────────────
  // 4. Resetar filtros
  // ──────────────────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    if (!userId) return;
    const defaults = getDefaultFilters(userId);
    const params = serializeFilters(defaults);
    router.push(`/analytics?${params.toString()}`);
  }, [userId, router]);

  // ──────────────────────────────────────────────────────────────────────
  // 5. Retornar API
  // ──────────────────────────────────────────────────────────────────────
  return {
    filters,
    setFilters,
    setMode,
    setPeriod,
    setDateRange,
    setAccounts,
    setCards,
    setCategories,
    resetFilters,
  };
}

