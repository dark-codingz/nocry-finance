// ============================================================================
// Hooks: Categorias (React Query)
// ============================================================================
// PROPÓSITO:
// - Hooks para gerenciar categorias com TanStack Query
// - Cache automático e invalidação inteligente
// - Mutations com feedback automático
//
// HOOKS:
// - useCategoriesList: Lista categorias (com filtros)
// - useCreateCategory: Cria nova categoria
// - useUpdateCategory: Atualiza categoria existente
// - useArchiveCategory: Arquiva categoria (soft delete)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/categories';

// ────────────────────────────────────────────────────────────────────────
// useCategoriesList - Lista categorias com filtros
// ────────────────────────────────────────────────────────────────────────
export function useCategoriesList(filters: {
  q?: string;
  type?: 'expense' | 'income' | 'all';
}) {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: () => api.listCategories(filters),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────
// useCreateCategory - Cria nova categoria
// ────────────────────────────────────────────────────────────────────────
export function useCreateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      // Invalidar todas as queries de categorias
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────
// useUpdateCategory - Atualiza categoria existente
// ────────────────────────────────────────────────────────────────────────
export function useUpdateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name: string; type: 'expense' | 'income' };
    }) => api.updateCategory(id, input),
    onSuccess: () => {
      // Invalidar todas as queries de categorias
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────
// useArchiveCategory - Arquiva categoria (soft delete)
// ────────────────────────────────────────────────────────────────────────
export function useArchiveCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.archiveCategory,
    onSuccess: () => {
      // Invalidar todas as queries de categorias
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}




