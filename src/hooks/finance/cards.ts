// ============================================================================
// Hooks: Cartões (React Query)
// ============================================================================
// PROPÓSITO:
// - Hooks para gerenciar cartões com TanStack Query
// - Cache automático e invalidação inteligente
// - Mutations com feedback automático
//
// HOOKS:
// - useCardsList: Lista cartões (com busca)
// - useCreateCard: Cria novo cartão
// - useUpdateCard: Atualiza cartão existente
// - useDeleteOrArchiveCard: Arquiva cartão (soft delete)
// - useCurrentInvoices: Lista faturas atuais (view)
// - useCurrentInvoiceDetail: Detalhes da fatura (transações)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/cards';

// ────────────────────────────────────────────────────────────────────────────
// useCardsList - Lista cartões com busca
// ────────────────────────────────────────────────────────────────────────────
export function useCardsList(q?: string) {
  return useQuery({
    queryKey: ['cards', { q: q ?? '' }],
    queryFn: () => api.listCards({ q }),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCreateCard - Cria novo cartão
// ────────────────────────────────────────────────────────────────────────────
export function useCreateCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.createCard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoices-current'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useUpdateCard - Atualiza cartão existente
// ────────────────────────────────────────────────────────────────────────────
export function useUpdateCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof api.updateCard>[1];
    }) => api.updateCard(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoices-current'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useDeleteOrArchiveCard - Arquiva cartão (soft delete)
// ────────────────────────────────────────────────────────────────────────────
export function useDeleteOrArchiveCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.deleteOrArchiveCard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoices-current'] });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCurrentInvoices - Lista faturas atuais (view card_invoices_current)
// ────────────────────────────────────────────────────────────────────────────
export function useCurrentInvoices() {
  return useQuery({
    queryKey: ['card-invoices-current'],
    queryFn: api.listCurrentInvoices,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCurrentInvoiceDetail - Detalhes da fatura (transações do ciclo)
// ────────────────────────────────────────────────────────────────────────────
export function useCurrentInvoiceDetail(cardId?: string) {
  return useQuery({
    queryKey: ['card-invoice-detail', cardId],
    queryFn: () => {
      if (!cardId) return Promise.resolve(null);
      return api.listCurrentInvoiceTransactions(cardId);
    },
    enabled: !!cardId, // Só executa se cardId estiver definido
    staleTime: 1000 * 30, // Cache por 30 segundos
  });
}



