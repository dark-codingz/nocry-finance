// ============================================================================
// Hooks: Loans (Empréstimos)
// ============================================================================
// PROPÓSITO:
// - React Query hooks para gerenciar empréstimos
// - Queries (buscar lista, buscar eventos)
// - Mutations (criar, atualizar, eventos, juros, quitar)
//
// USO:
// const { data: loans } = useLoansList({ status: 'active', q: '' });
// const create = useCreateLoan();
// create.mutate({ person_name: 'João', principal_cents: 100000, ... });
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/loans';

// ────────────────────────────────────────────────────────────────────────────
// Re-export tipos para facilitar uso
// ────────────────────────────────────────────────────────────────────────────
export type { Loan, LoanSummary, LoanEvent, LoanEventInput } from '@/services/loans';

// ────────────────────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────────────────────

/**
 * useLoansList - Buscar lista de empréstimos com saldos
 */
export function useLoansList(filters: {
  status?: 'all' | 'active' | 'closed';
  q?: string;
}) {
  return useQuery({
    queryKey: ['loans', filters],
    queryFn: () => api.listLoans(filters),
    staleTime: 10_000, // Cache por 10 segundos
  });
}

/**
 * useLoanEvents - Buscar extrato de um empréstimo
 */
export function useLoanEvents(loanId?: string) {
  return useQuery({
    queryKey: ['loan-events', loanId],
    queryFn: () => (loanId ? api.listLoanEvents(loanId) : Promise.resolve([])),
    enabled: !!loanId, // Só busca se tiver loanId
    staleTime: 5_000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────────────────────

/**
 * useCreateLoan - Criar novo empréstimo
 * Invalida lista de empréstimos após sucesso
 */
export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

/**
 * useTopupLoan - Adicionar novo aporte ao empréstimo
 * Invalida lista de empréstimos e eventos do loan específico
 */
export function useTopupLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.topupLoan,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan-events', vars.loan_id] });
    },
  });
}

/**
 * useRepayLoan - Registrar pagamento recebido
 * Invalida lista de empréstimos e eventos do loan específico
 */
export function useRepayLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.repayLoan,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan-events', vars.loan_id] });
    },
  });
}

/**
 * useAddInterest - Adicionar juros manual (ou presente)
 * Invalida lista de empréstimos e eventos do loan específico
 */
export function useAddInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addInterest,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan-events', vars.loan_id] });
    },
  });
}

/**
 * useApplyInterestPeriod - Aplicar juros automáticos do período
 * Usa RPC apply_monthly_interest do banco
 * Invalida lista de empréstimos e eventos do loan específico
 */
export function useApplyInterestPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loan_id, untilISO }: { loan_id: string; untilISO: string }) =>
      api.applyInterestPeriod(loan_id, untilISO),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan-events', vars.loan_id] });
    },
  });
}

/**
 * useCloseLoan - Quitar/fechar empréstimo
 * Muda status para 'closed'
 * Invalida lista de empréstimos
 */
export function useCloseLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.closeLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

/**
 * useUpdateLoanConfig - Atualizar configuração do empréstimo
 * (nome, notas, modo de juros, taxa)
 * Invalida lista de empréstimos e eventos do loan específico
 */
export function useUpdateLoanConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) =>
      api.updateLoanConfig(id, input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan-events', vars.id] });
    },
  });
}



