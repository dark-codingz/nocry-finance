"use client";

// ============================================================================
// useBudgetHealth - Hook para análise de saúde do orçamento
// ============================================================================
// Propósito: Calcular métricas de orçamento e gerar avisos/incentivos.
//
// REGRAS DE NEGÓCIO:
// 1. Percentual atingido = despesas / orçamento (0-1)
// 2. Avisos:
//    - Orçamento alto: >= 80% usado
//    - Orçamento estourado: >= 100% usado
// 3. Incentivos:
//    - < 50%: "Continue no ritmo!"
//    - >= 50% && < 100%: "Falta apenas X% para bater sua meta!"
//    - >= 100%: Ocultar card de incentivo
//
// EVOLUÇÃO FUTURA:
// - Integrar com metas de categoria
// - Adicionar previsão de gasto baseado no histórico
// - Notificações push quando atingir 80%/100%
// ============================================================================

import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Tipos
// ============================================================================

interface UseBudgetHealthParams {
  userId: string | null;
  budgetCents: number | null; // Orçamento do mês/período
  totalExpenseCents: number;  // Total de despesas no período
  biggestInvoice: {
    cardName: string;
    amountCents: number;
    daysToDue: number;
  } | null;
}

interface BudgetHealthData {
  hasBudget: boolean;
  pctAtingido: number; // 0-1 (clamped)
  faltaPct: number;    // 0-100 (percentual restante para meta)
  warn: {
    high: boolean;    // >= 80% usado
    burst: boolean;   // >= 100% usado
  };
  invoice: {
    daysToDue: number;
    amountCents: number;
    cardName: string;
  } | null;
}

// ============================================================================
// Função de Cálculo (pura, síncrona)
// ============================================================================

function calculateBudgetHealth(params: UseBudgetHealthParams): BudgetHealthData {
  const { budgetCents, totalExpenseCents, biggestInvoice } = params;

  // Caso 1: Sem orçamento definido
  if (!budgetCents || budgetCents <= 0) {
    return {
      hasBudget: false,
      pctAtingido: 0,
      faltaPct: 0,
      warn: { high: false, burst: false },
      invoice: biggestInvoice,
    };
  }

  // Caso 2: Com orçamento
  const pctAtingido = Math.min(totalExpenseCents / budgetCents, 1.5); // Clamp máximo 150%
  const faltaPct = Math.max(0, 100 - (pctAtingido * 100));

  return {
    hasBudget: true,
    pctAtingido,
    faltaPct: Math.round(faltaPct), // Arredonda para inteiro
    warn: {
      high: pctAtingido >= 0.8 && pctAtingido < 1,
      burst: pctAtingido >= 1,
    },
    invoice: biggestInvoice,
  };
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useBudgetHealth(params: UseBudgetHealthParams) {
  return useQuery({
    queryKey: ['budget-health', params.userId, params.budgetCents, params.totalExpenseCents],
    queryFn: () => calculateBudgetHealth(params),
    enabled: !!params.userId,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: false,
    initialData: {
      hasBudget: false,
      pctAtingido: 0,
      faltaPct: 0,
      warn: { high: false, burst: false },
      invoice: null,
    },
  });
}





