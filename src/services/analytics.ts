// ============================================================================
// analytics.ts - Service para Analytics e Séries Temporais
// ============================================================================
// PROPÓSITO:
// - Buscar séries temporais de finanças pessoais
// - Agregações mensais de receitas, despesas e líquido
// - Integração com RPC do Supabase
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
export type PfMonthlyRow = {
  month_key: string; // 'YYYY-MM'
  total_income_cents: number;
  total_expense_cents: number;
  net_cents: number;
};

// ────────────────────────────────────────────────────────────────────────────
// Série Mensal de Finanças Pessoais
// ────────────────────────────────────────────────────────────────────────────
/**
 * Busca série mensal de receitas, despesas e líquido.
 * Preenche meses sem movimento com zero.
 * 
 * @param monthsBack - Quantos meses para trás (default: 12)
 * @returns Array de dados mensais ordenados por mês
 * 
 * @example
 * ```ts
 * const data = await getPfMonthlySeries(12);
 * // Retorna últimos 12 meses com valores agregados
 * ```
 */
export async function getPfMonthlySeries(
  monthsBack: number = 12
): Promise<PfMonthlyRow[]> {
  const sb = createSupabaseBrowser();

  const { data, error } = await sb.rpc('pf_monthly_series', {
    p_months_back: monthsBack,
  });

  if (error) throw error;

  return data ?? [];
}

// ────────────────────────────────────────────────────────────────────────────
// Saldo Líquido por Período (Filtrado)
// ────────────────────────────────────────────────────────────────────────────
export type NetByPeriodRow = {
  total_income_cents: number;
  total_expense_cents: number;
  net_cents: number;
};

/**
 * Garante data no formato ISO (YYYY-MM-DD).
 * Se vazia ou inválida, retorna data de hoje.
 * 
 * @param d - Data no formato YYYY-MM-DD (opcional)
 * @returns Data normalizada YYYY-MM-DD
 */
function ensureISO(d?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!d) return today;
  
  // Valida formato YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
}

/**
 * Busca receitas, despesas e líquido em um período específico.
 * Usado para o card "Saldo Líquido" do Dashboard com filtro de datas.
 * 
 * REGIME DE CAIXA:
 * - Busca todas as transações do período
 * - Filtra NO FRONTEND para excluir compras de cartão (card_id IS NOT NULL)
 * - Calcula no frontend (mais simples que mexer no SQL)
 * 
 * ROBUSTEZ:
 * - Valida e normaliza datas
 * - Sempre retorna valores (defaults para 0)
 * - Não duplica despesas (compras de cartão ficam na "Fatura Atual")
 * 
 * @param date_from - Data inicial (YYYY-MM-DD)
 * @param date_to - Data final (YYYY-MM-DD)
 * @returns Receitas, despesas e líquido do período (regime de caixa)
 * 
 * @example
 * ```ts
 * const data = await getNetByPeriod('2025-01-01', '2025-01-31');
 * // Retorna totais do período (SEM compras de cartão)
 * ```
 */
export async function getNetByPeriod(
  date_from: string,
  date_to: string
): Promise<NetByPeriodRow> {
  const sb = createSupabaseBrowser();

  // Validar datas antes de enviar
  date_from = ensureISO(date_from);
  date_to = ensureISO(date_to);

  // Buscar TODAS as transações do período (income e expense)
  const { data, error } = await sb
    .from('transactions')
    .select('type, amount_cents, card_id')
    .in('type', ['income', 'expense']) // Ignora transfer
    .gte('occurred_at', date_from)
    .lte('occurred_at', date_to);

  if (error) {
    throw new Error(error.message || 'Falha ao buscar transações');
  }

  // Calcular no frontend (REGIME DE CAIXA)
  let total_income_cents = 0;
  let total_expense_cents = 0;

  (data || []).forEach(tx => {
    if (tx.type === 'income') {
      total_income_cents += tx.amount_cents;
    } else if (tx.type === 'expense' && tx.card_id === null) {
      // REGIME DE CAIXA: Só conta despesa se NÃO for cartão
      // Compras de cartão ficam na "Fatura Atual"
      total_expense_cents += tx.amount_cents;
    }
  });

  return {
    total_income_cents,
    total_expense_cents,
    net_cents: total_income_cents - total_expense_cents,
  };
}

