// ============================================================================
// Hooks: Wallet (Carteira)
// ============================================================================
// PROPÓSITO:
// - React Query hooks para contas, cartões e transações
// - Cache e refetch automático
// - Estados de loading/error consistentes
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/services/wallet';

// ────────────────────────────────────────────────────────────────────────────
// useWalletAccounts - Lista contas do usuário
// ────────────────────────────────────────────────────────────────────────────
export function useWalletAccounts() {
  return useQuery({
    queryKey: ['wallet-accounts'],
    queryFn: api.listAccounts,
    staleTime: 10_000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useWalletCards - Lista cartões do usuário
// ────────────────────────────────────────────────────────────────────────────
export function useWalletCards() {
  return useQuery({
    queryKey: ['wallet-cards'],
    queryFn: api.listCards,
    staleTime: 10_000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useWalletTransactions - Lista transações com filtros
// ────────────────────────────────────────────────────────────────────────────
export function useWalletTransactions(filters: {
  date_from?: string;
  date_to?: string;
  q?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['wallet-transactions', filters],
    queryFn: () => api.listTransactions(filters),
    staleTime: 5_000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Re-exportar tipos para conveniência
// ────────────────────────────────────────────────────────────────────────────
export type { Account, Card, Tx } from '@/services/wallet';




