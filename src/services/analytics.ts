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
 * ROBUSTEZ:
 * - Valida e normaliza datas antes de enviar
 * - Envia JSON único (evita problemas de ordem/cache)
 * - RPC trata NULL e inverte intervalo automaticamente
 * - Sempre retorna valores (defaults para 0)
 * 
 * @param date_from - Data inicial (YYYY-MM-DD)
 * @param date_to - Data final (YYYY-MM-DD)
 * @returns Receitas, despesas e líquido do período
 * 
 * @example
 * ```ts
 * const data = await getNetByPeriod('2025-01-01', '2025-01-31');
 * // Retorna totais do período filtrado
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

  // Chamar RPC com parâmetro JSON único (sintaxe inline)
  const { data, error } = await sb.rpc('pf_net_by_period', { p: { date_from, date_to } });

  if (error) {
    // Propaga mensagem legível
    throw new Error(error.message || 'Falha em pf_net_by_period');
  }

  // data é um array com 1 linha (ou vazio)
  const row = Array.isArray(data) ? data[0] : data;

  return {
    total_income_cents: Number(row?.total_income_cents ?? 0),
    total_expense_cents: Number(row?.total_expense_cents ?? 0),
    net_cents: Number(row?.net_cents ?? 0),
  };
}

