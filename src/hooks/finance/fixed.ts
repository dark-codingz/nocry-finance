// ============================================================================
// Hooks: Contas Fixas (React Query)
// ============================================================================
// PROPÓSITO:
// - Hooks para gerenciar contas fixas com TanStack Query
// - Cache automático e invalidação inteligente
// - Mutations com feedback automático
//
// HOOKS:
// - useFixedList: Lista contas fixas (com filtros)
// - useCreateFixed: Cria nova conta fixa
// - useUpdateFixed: Atualiza conta fixa existente
// - useToggleFixedActive: Ativa/desativa conta fixa
// - useRemoveFixed: Remove conta fixa
// - useLaunchFixed: Lança contas fixas do mês
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/fixed';

// ────────────────────────────────────────────────────────────────────────────
// useFixedList - Lista contas fixas com filtros
// ────────────────────────────────────────────────────────────────────────────
export function useFixedList(filters: {
  q?: string;
  type?: 'all' | 'expense' | 'income';
  active?: 'all' | 'active' | 'inactive';
}) {
  return useQuery({
    queryKey: ['fixed-expenses', filters],
    queryFn: () => api.listFixed(filters),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCreateFixed - Cria nova conta fixa
// ────────────────────────────────────────────────────────────────────────────
export function useCreateFixed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.createFixed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-expenses'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useUpdateFixed - Atualiza conta fixa existente
// ────────────────────────────────────────────────────────────────────────────
export function useUpdateFixed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<api.FixedItem> }) =>
      api.updateFixed(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-expenses'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useToggleFixedActive - Ativa/desativa conta fixa
// ────────────────────────────────────────────────────────────────────────────
export function useToggleFixedActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.toggleActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-expenses'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useRemoveFixed - Remove conta fixa
// ────────────────────────────────────────────────────────────────────────────
export function useRemoveFixed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.removeFixed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-expenses'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useLaunchFixed - Lança contas fixas do mês
// ────────────────────────────────────────────────────────────────────────────
export function useLaunchFixed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.launchFixedForMonth,
    onSuccess: () => {
      // Invalidar queries relacionadas a transações
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-kpis'] });
      qc.invalidateQueries({ queryKey: ['recent-finance'] });
    },
  });
}



