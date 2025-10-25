// ============================================================================
// Hooks: SDM e Saldo Líquido
// ============================================================================
// PROPÓSITO:
// - Hooks para calcular indicadores de disponibilidade financeira
// - useSaldoLiquido: Entradas - Saídas (realizado no mês)
// - useFixedRemaining: Contas fixas ainda não lançadas no mês
// - useInvoicesDueThisMonth: Faturas de cartão que vencem no mês
//
// NOTA SOBRE SDM:
// SDM = Saldo Disponível no Mês (projeção de caixa disponível)
// Fórmula: net_cents - fixed_remaining_cents - invoices_due_this_month_cents
//
// IMPORTANTE:
// Se as compras de cartão já foram reconhecidas como despesas no momento
// da compra, subtrair o valor total da fatura pode ocasionar 'double counting'
// do ponto de vista de resultado contábil. Aqui estamos tratando SDM como
// disponibilidade de caixa projetada (saídas futuras ainda não ocorridas),
// por isso incluímos faturas do mês como compromisso de pagamento.
//
// ROBUSTEZ:
// - Usa .maybeSingle() ao invés de .single() para não quebrar quando vazio
// - Retorna defaults (0) quando não houver dados
// - Loga erros apenas em desenvolvimento para facilitar debug
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ────────────────────────────────────────────────────────────────────────────
// Helper: Log de erros apenas em desenvolvimento
// ────────────────────────────────────────────────────────────────────────────
function devLog(tag: string, error: any) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[SDM:${tag}]`, error);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// useSaldoLiquido - Entradas - Saídas (realizado)
// ────────────────────────────────────────────────────────────────────────────
export function useSaldoLiquido() {
  return useQuery({
    queryKey: ['pf-month-summary'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('pf_month_summary')
        .select('*')
        .maybeSingle(); // <- Não quebra se não houver linha

      if (error) {
        devLog('month_summary', error);
      }

      // Retorna defaults se não houver dados
      return (data ?? {
        month: null,
        total_income_cents: 0,
        total_expense_cents: 0,
        net_cents: 0,
      }) as {
        month: string | null;
        total_income_cents: number;
        total_expense_cents: number;
        net_cents: number;
      };
    },
    staleTime: 10_000, // Cache por 10 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useFixedRemaining - Contas fixas restantes no mês
// ────────────────────────────────────────────────────────────────────────────
export function useFixedRemaining() {
  return useQuery({
    queryKey: ['pf-fixed-remaining'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('pf_fixed_remaining_current_month')
        .select('*')
        .maybeSingle(); // <- Não quebra se não houver linha

      if (error) {
        devLog('fixed_remaining', error);
      }

      // Retorna defaults se não houver dados
      return (data ?? {
        start_month: null,
        end_month: null,
        fixed_remaining_cents: 0,
        items_remaining: 0,
      }) as {
        start_month: string | null;
        end_month: string | null;
        fixed_remaining_cents: number;
        items_remaining: number;
      };
    },
    staleTime: 10_000, // Cache por 10 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useInvoicesDueThisMonth - Faturas que vencem no mês (DEPRECATED)
// ────────────────────────────────────────────────────────────────────────────
// NOTA: Este hook filtra por due_date no mês atual. Use useCurrentInvoicesTotal
// se quiser somar TODAS as faturas atuais independente do vencimento.
// ────────────────────────────────────────────────────────────────────────────
export function useInvoicesDueThisMonth() {
  return useQuery({
    queryKey: ['pf-card-invoices-due-this-month'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('pf_card_invoices_due_this_month')
        .select('*')
        .maybeSingle(); // <- Não quebra se não houver linha

      if (error) {
        devLog('invoices_due', error);
      }

      // Retorna defaults se não houver dados
      return (data ?? {
        start_month: null,
        end_month: null,
        invoices_due_this_month_cents: 0,
      }) as {
        start_month: string | null;
        end_month: string | null;
        invoices_due_this_month_cents: number;
      };
    },
    staleTime: 10_000, // Cache por 10 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useCurrentInvoicesTotal - Total das faturas atuais (RECOMENDADO)
// ────────────────────────────────────────────────────────────────────────────
// PROPÓSITO:
// - Soma TODAS as faturas atuais (amount_cents de card_invoices_current)
// - NÃO depende do due_date (sempre considera a fatura atual do cartão)
// - Melhor para SDM como "disponibilidade de caixa projetada"
//
// DIFERENÇA vs useInvoicesDueThisMonth:
// - useInvoicesDueThisMonth: Filtra por due_date no mês atual (pode retornar 0)
// - useCurrentInvoicesTotal: Soma TODAS as faturas atuais (sempre reflete o total)
// ────────────────────────────────────────────────────────────────────────────
export function useCurrentInvoicesTotal() {
  return useQuery({
    queryKey: ['pf-card-invoices-current-total'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('card_invoices_current')
        .select('amount_cents');

      if (error) {
        devLog('invoices_current_total', error);
      }

      // Somar todos os amount_cents
      const total = (data ?? []).reduce(
        (sum: number, row: any) => sum + (row.amount_cents ?? 0),
        0
      );

      return {
        invoices_current_total_cents: total,
      };
    },
    staleTime: 10_000, // Cache por 10 segundos
  });
}

