// ============================================================================
// Hooks: Contas (React Query)
// ============================================================================
// PROPÓSITO:
// - Hooks para gerenciar contas com TanStack Query
// - Cache automático e invalidação inteligente
// - Mutations com feedback automático
//
// HOOKS:
// - useAccountsList: Lista contas (com busca)
// - useCreateAccount: Cria nova conta
// - useUpdateAccount: Atualiza conta existente
// - useArchiveAccount: Arquiva conta (soft delete)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/accounts';

// ────────────────────────────────────────────────────────────────────────────
// useAccountsList - Lista contas com busca
// ────────────────────────────────────────────────────────────────────────────
export function useAccountsList(q?: string) {
  return useQuery({
    queryKey: ['accounts', { q: q ?? '' }],
    queryFn: () => api.listAccounts({ q }),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCreateAccount - Cria nova conta
// ────────────────────────────────────────────────────────────────────────────
export function useCreateAccount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      // Invalidar todas as queries de contas
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useUpdateAccount - Atualiza conta existente
// ────────────────────────────────────────────────────────────────────────────
export function useUpdateAccount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name: string; notes?: string | null };
    }) => api.updateAccount(id, input),
    onSuccess: () => {
      // Invalidar todas as queries de contas
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useArchiveAccount - Arquiva conta (soft delete)
// ────────────────────────────────────────────────────────────────────────────
export function useArchiveAccount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.archiveAccount,
    onSuccess: () => {
      // Invalidar todas as queries de contas
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}




