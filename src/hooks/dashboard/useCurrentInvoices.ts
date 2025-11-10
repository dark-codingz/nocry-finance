// ============================================================================
// useCurrentInvoices - Hook para Fatura Atual
// ============================================================================
// Propósito: Buscar valor total das faturas em aberto (ciclo atual).
//
// ORIGEM DOS DADOS:
// - View: card_invoices_current
// - Agregação: Soma de todos os cartões no ciclo atual
//
// CÁLCULOS:
// - amountCents: Soma de todas as faturas abertas
// - dueDate: Próxima data de vencimento (menor due_date)
// - daysToDue: Dias até o vencimento
//
// RETORNO:
// - { amountCents, dueDate, daysToDue }
//
// PRÓXIMOS PASSOS:
// - Exibir breakdown por cartão (modal ou lista expandível)
// ============================================================================

"use client";

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// ============================================================================
// Tipos
// ============================================================================

interface CurrentInvoicesParams {
  userId: string;
}

interface CurrentInvoices {
  amountCents: number;
  dueDate: string | null;      // ISO date
  daysToDue: number | null;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useCurrentInvoices(params: CurrentInvoicesParams) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['current-invoices', params.userId],
    queryFn: async (): Promise<CurrentInvoices> => {
      // ─────────────────────────────────────────────────────────────────
      // 1. Buscar faturas atuais de todos os cartões (COM pagamentos)
      // ─────────────────────────────────────────────────────────────────
      // NOTA: A view card_invoices_with_payments calcula: charges - payments = balance
      const { data: invoices, error } = await supabase
        .from('card_invoices_with_payments')
        .select('balance_cents, due_date, days_to_due');

      if (error) throw error;

      // ─────────────────────────────────────────────────────────────────
      // 2. Agregar valores de todos os cartões (saldo aberto = charges - payments)
      // ─────────────────────────────────────────────────────────────────
      const amountCents = invoices?.reduce((sum, inv) => sum + (inv.balance_cents || 0), 0) || 0;

      // ─────────────────────────────────────────────────────────────────
      // 3. Encontrar próximo vencimento (menor due_date)
      // ─────────────────────────────────────────────────────────────────
      let dueDate: string | null = null;
      let daysToDue: number | null = null;

      if (invoices && invoices.length > 0) {
        // Ordenar por due_date ascendente e pegar o primeiro
        const sorted = invoices
          .filter((inv) => inv.due_date)
          .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

        if (sorted.length > 0) {
          dueDate = sorted[0].due_date;
          daysToDue = sorted[0].days_to_due;
        }
      }

      return {
        amountCents,
        dueDate,
        daysToDue,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!params.userId,
  });
}





