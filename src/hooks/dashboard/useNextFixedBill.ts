// ============================================================================
// useNextFixedBill - Hook para Próxima Conta Fixa
// ============================================================================
// Propósito: Buscar a próxima conta fixa a vencer.
//
// ORIGEM DOS DADOS:
// - Tabela: fixed_bills (day_of_month, amount_cents, name)
//
// CÁLCULOS:
// - Próximo vencimento: Menor day_of_month >= dia de hoje no mês atual
// - Se não houver no mês atual, pegar a primeira do próximo mês
//
// RETORNO:
// - { name, amountCents, dueDay, daysUntilDue } ou null
//
// PRÓXIMOS PASSOS:
// - Considerar last_run_month para excluir fixas já lançadas
// ============================================================================

"use client";

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// ============================================================================
// Tipos
// ============================================================================

interface NextFixedBillParams {
  userId: string;
}

interface NextFixedBill {
  name: string;
  amountCents: number;
  dueDay: number;           // Dia do mês (1-31)
  daysUntilDue: number;
}

// ============================================================================
// Helper: Calcular próximo vencimento
// ============================================================================

function calculateNextDueDate(dayOfMonth: number): { dueDay: number; daysUntilDue: number } {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Tentar no mês atual
  if (dayOfMonth >= currentDay) {
    const dueDate = new Date(currentYear, currentMonth, dayOfMonth);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      dueDay: dayOfMonth,
      daysUntilDue: diffDays,
    };
  }

  // Próximo mês
  const nextMonth = currentMonth + 1;
  const nextMonthDate = new Date(currentYear, nextMonth, dayOfMonth);
  const diffTime = nextMonthDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    dueDay: dayOfMonth,
    daysUntilDue: diffDays,
  };
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useNextFixedBill(params: NextFixedBillParams) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['next-fixed-bill', params.userId],
    queryFn: async (): Promise<NextFixedBill | null> => {
      // ─────────────────────────────────────────────────────────────────
      // 1. Buscar todas as contas fixas ativas
      // ─────────────────────────────────────────────────────────────────
      const { data: bills, error } = await supabase
        .from('fixed_bills')
        .select('name, amount_cents, day_of_month')
        .eq('user_id', params.userId)
        .order('day_of_month', { ascending: true });

      if (error) throw error;
      if (!bills || bills.length === 0) return null;

      // ─────────────────────────────────────────────────────────────────
      // 2. Calcular dias até vencimento para cada conta
      // ─────────────────────────────────────────────────────────────────
      const billsWithDue = bills.map((bill) => {
        const { dueDay, daysUntilDue } = calculateNextDueDate(bill.day_of_month);
        return {
          name: bill.name,
          amountCents: bill.amount_cents,
          dueDay,
          daysUntilDue,
        };
      });

      // ─────────────────────────────────────────────────────────────────
      // 3. Retornar a mais próxima (menor daysUntilDue)
      // ─────────────────────────────────────────────────────────────────
      const nextBill = billsWithDue.sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];

      return nextBill;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!params.userId,
  });
}




