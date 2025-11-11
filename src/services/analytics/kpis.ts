// ============================================================================
// services/analytics/kpis.ts - Service para KPIs de Saúde
// ============================================================================
// PROPÓSITO:
// - Buscar dados de KPIs de saúde financeira
// - Integrar múltiplas views SQL
// - Calcular KPIs compostos (SR, DTI, Emergência, Runway, etc.)
//
// ORIGEM DOS DADOS:
// - v_kpis_core (KPIs pré-calculados)
// - v_budget_vs_actual (Orçamento x Realizado)
// - v_statement_open (Utilização de crédito)
// - accounts (Reserva de emergência)
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type HealthKpis = {
  // Savings Ratio
  savingsRatio: {
    value: number; // Percentual (0-100)
    mom: number; // Variação MoM (%)
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };

  // DTI (Debt-to-Income)
  dti: {
    value: number; // Percentual (0-100+)
    mom: number;
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };

  // Emergência (Meses de Reserva)
  emergency: {
    months: number; // Quantidade de meses
    reserveCents: number; // Valor da reserva
    avgMonthlyExpenseCents: number; // Despesa mensal média
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };

  // Runway (Pista de Liquidez)
  runway: {
    months: number; // Quantidade de meses
    liquidAssetsCents: number; // Ativos líquidos
    avgMonthlyBurnCents: number; // Queima mensal média
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };

  // % Orçamento Consumido
  budgetConsumed: {
    consumed: number; // Percentual consumido (0-100+)
    budgetCents: number; // Orçamento total
    actualCents: number; // Gasto real
    remainingCents: number; // Restante
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };

  // Utilização de Crédito
  creditUtilization: {
    utilization: number; // Percentual (0-100+)
    usedCents: number; // Valor usado
    limitCents: number; // Limite total
    availableCents: number; // Disponível
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };
};

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca todos os KPIs de saúde financeira
 * 
 * @param filters - Filtros de analytics
 * @returns KPIs calculados com badges
 */
export async function getHealthKpis(
  filters: AnalyticsFilters
): Promise<HealthKpis> {
  const supabase = createSupabaseBrowser();

  // ──────────────────────────────────────────────────────────────────────
  // 1. Buscar KPIs pré-calculados (mês atual e anterior)
  // ──────────────────────────────────────────────────────────────────────
  const currentMonth = filters.dateRange.from.slice(0, 7); // YYYY-MM
  const previousMonth = getPreviousMonth(currentMonth);

  const { data: kpisData, error: kpisError } = await supabase
    .from('v_kpis_core')
    .select('*')
    .eq('user_id', filters.userId)
    .in('year_month', [currentMonth, previousMonth])
    .order('year_month', { ascending: false });

  if (kpisError) throw kpisError;

  const currentKpis = kpisData?.find((k) => k.year_month === currentMonth);
  const previousKpis = kpisData?.find((k) => k.year_month === previousMonth);

  // ──────────────────────────────────────────────────────────────────────
  // 2. Buscar Orçamento vs Realizado (mês atual)
  // ──────────────────────────────────────────────────────────────────────
  const { data: budgetData, error: budgetError } = await supabase
    .from('v_budget_vs_actual')
    .select('*')
    .eq('user_id', filters.userId)
    .eq('year_month', currentMonth)
    .limit(1)
    .single();

  if (budgetError && budgetError.code !== 'PGRST116') {
    throw budgetError; // Ignora erro "no rows" (PGRST116)
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Buscar Utilização de Crédito (agregado)
  // ──────────────────────────────────────────────────────────────────────
  const { data: creditData, error: creditError } = await supabase
    .from('v_statement_open')
    .select('*')
    .eq('user_id', filters.userId);

  if (creditError) throw creditError;

  const totalUsed = creditData?.reduce((sum, c) => sum + c.open_amount_cents, 0) || 0;
  const totalLimit = creditData?.reduce((sum, c) => sum + c.limit_cents, 0) || 0;

  // ──────────────────────────────────────────────────────────────────────
  // 4. Buscar Reserva de Emergência (conta específica ou soma de todas)
  // ──────────────────────────────────────────────────────────────────────
  // TODO: Implementar lógica de "conta reserva" (tag ou flag)
  // Por enquanto, soma TODAS as contas como "ativos líquidos"
  const { data: accountsData, error: accountsError } = await supabase
    .from('accounts')
    .select('initial_balance_cents')
    .eq('user_id', filters.userId);

  if (accountsError) throw accountsError;

  const liquidAssets = accountsData?.reduce((sum, a) => sum + a.initial_balance_cents, 0) || 0;

  // ──────────────────────────────────────────────────────────────────────
  // 5. Calcular média de despesas dos últimos 3 meses (para Emergência)
  // ──────────────────────────────────────────────────────────────────────
  const last3Months = getLast3Months(currentMonth);

  const { data: last3MonthsData, error: last3Error } = await supabase
    .from('v_kpis_core')
    .select('expense_cents')
    .eq('user_id', filters.userId)
    .in('year_month', last3Months);

  if (last3Error) throw last3Error;

  const avgExpense3M =
    last3MonthsData && last3MonthsData.length > 0
      ? last3MonthsData.reduce((sum, k) => sum + k.expense_cents, 0) / last3MonthsData.length
      : 0;

  // ──────────────────────────────────────────────────────────────────────
  // 6. Calcular KPIs
  // ──────────────────────────────────────────────────────────────────────

  // Savings Ratio (simplificado: net / income)
  const currentIncome = currentKpis?.income_cents || 0;
  const currentExpense = currentKpis?.expense_cents || 0;
  const currentNet = currentIncome - currentExpense;
  const savingsRatioValue = currentIncome > 0 ? (currentNet / currentIncome) * 100 : 0;

  const previousIncome = previousKpis?.income_cents || 0;
  const previousExpense = previousKpis?.expense_cents || 0;
  const previousNet = previousIncome - previousExpense;
  const previousSavingsRatio = previousIncome > 0 ? (previousNet / previousIncome) * 100 : 0;
  const savingsRatioMom = previousSavingsRatio > 0 ? savingsRatioValue - previousSavingsRatio : 0;

  // DTI (simplificado: sem dados de dívida específicos por enquanto)
  // Usar pagamentos de fatura como proxy
  const dtiValue = 0; // TODO: Implementar quando tivermos invoice_payments no período
  const dtiMom = 0;

  // Emergência
  const emergencyMonths = avgExpense3M > 0 ? liquidAssets / avgExpense3M : 0;

  // Runway (mesmo que Emergência por enquanto)
  const runwayMonths = emergencyMonths;

  // Orçamento Consumido
  const budgetCents = budgetData?.budget_cents || 0;
  const actualCents = budgetData?.total_actual_cents || 0;
  const consumedPct = budgetCents > 0 ? (actualCents / budgetCents) * 100 : 0;
  const remainingCents = budgetCents - actualCents;

  // Utilização de Crédito
  const utilizationPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  // ──────────────────────────────────────────────────────────────────────
  // 7. Retornar KPIs com badges
  // ──────────────────────────────────────────────────────────────────────
  return {
    savingsRatio: {
      value: savingsRatioValue,
      mom: savingsRatioMom,
      badge: getBadgeSR(savingsRatioValue),
    },
    dti: {
      value: dtiValue,
      mom: dtiMom,
      badge: getBadgeDTI(dtiValue),
    },
    emergency: {
      months: emergencyMonths,
      reserveCents: liquidAssets,
      avgMonthlyExpenseCents: avgExpense3M,
      badge: getBadgeEmergency(emergencyMonths),
    },
    runway: {
      months: runwayMonths,
      liquidAssetsCents: liquidAssets,
      avgMonthlyBurnCents: avgExpense3M,
      badge: getBadgeRunway(runwayMonths),
    },
    budgetConsumed: {
      consumed: consumedPct,
      budgetCents,
      actualCents,
      remainingCents,
      badge: getBadgeBudget(consumedPct),
    },
    creditUtilization: {
      utilization: utilizationPct,
      usedCents: totalUsed,
      limitCents: totalLimit,
      availableCents: totalLimit - totalUsed,
      badge: getBadgeCredit(utilizationPct),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month - 2 porque JS é 0-indexed
  return date.toISOString().slice(0, 7);
}

function getLast3Months(currentMonth: string): string[] {
  const result: string[] = [];
  const [year, month] = currentMonth.split('-').map(Number);

  for (let i = 0; i < 3; i++) {
    const date = new Date(year, month - 1 - i, 1);
    result.push(date.toISOString().slice(0, 7));
  }

  return result;
}

// Badges baseados nos thresholds
function getBadgeSR(value: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value >= 20) return 'success';
  if (value >= 10) return 'warning';
  return 'danger';
}

function getBadgeDTI(value: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value <= 20) return 'success';
  if (value <= 40) return 'warning';
  return 'danger';
}

function getBadgeEmergency(months: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (months >= 6) return 'success';
  if (months >= 3) return 'warning';
  return 'danger';
}

function getBadgeRunway(months: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (months >= 12) return 'success';
  if (months >= 6) return 'warning';
  return 'danger';
}

function getBadgeBudget(consumed: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (consumed <= 80) return 'success';
  if (consumed <= 100) return 'warning';
  return 'danger';
}

function getBadgeCredit(utilization: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (utilization <= 30) return 'success';
  if (utilization <= 60) return 'warning';
  return 'danger';
}

