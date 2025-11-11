// ============================================================================
// services/analytics/flow.ts - Service para Flow & Tendências
// ============================================================================
// PROPÓSITO:
// - Buscar séries temporais de receitas, despesas e líquido
// - Suportar modo CAIXA e COMPETÊNCIA
// - Calcular médias móveis e outliers
//
// ORIGEM DOS DADOS:
// - v_cash_movements_monthly (modo CAIXA)
// - v_charges_monthly (modo COMPETÊNCIA)
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { calculateMovingAverage } from '@/lib/analytics/formulas';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type FlowDataPoint = {
  month: string; // YYYY-MM
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type FlowData = {
  series: FlowDataPoint[];
  movingAverage: {
    income: number[]; // MA3
    expense: number[];
    net: number[];
  };
  outliers: {
    month: string;
    type: 'income' | 'expense';
    value: number;
    deviation: number; // Desvio em stddev
  }[];
};

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca dados de Flow & Tendências
 * 
 * @param filters - Filtros de analytics
 * @returns Série temporal com MA3 e outliers
 */
export async function getFlowData(filters: AnalyticsFilters): Promise<FlowData> {
  const supabase = createSupabaseBrowser();

  if (filters.mode === 'cash') {
    return getFlowDataCash(supabase, filters);
  } else {
    return getFlowDataAccrual(supabase, filters);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MODO CAIXA
// ────────────────────────────────────────────────────────────────────────────

async function getFlowDataCash(
  supabase: any,
  filters: AnalyticsFilters
): Promise<FlowData> {
  // Buscar dados de v_cash_movements_monthly
  const { data, error } = await supabase
    .from('v_cash_movements_monthly')
    .select('year_month, type, total_cents')
    .eq('user_id', filters.userId)
    .gte('year_month', filters.dateRange.from.slice(0, 7)) // YYYY-MM
    .lte('year_month', filters.dateRange.to.slice(0, 7))
    .order('year_month', { ascending: true });

  if (error) throw error;

  // Agrupar por mês
  const grouped = groupByMonth(data || []);

  // Calcular médias móveis
  const incomeValues = grouped.map((g) => g.incomeCents);
  const expenseValues = grouped.map((g) => g.expenseCents);
  const netValues = grouped.map((g) => g.netCents);

  const incomeMA = calculateMovingAverage(incomeValues, 3);
  const expenseMA = calculateMovingAverage(expenseValues, 3);
  const netMA = calculateMovingAverage(netValues, 3);

  // Detectar outliers
  const outliers = detectOutliers(grouped);

  return {
    series: grouped,
    movingAverage: {
      income: incomeMA,
      expense: expenseMA,
      net: netMA,
    },
    outliers,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// MODO COMPETÊNCIA
// ────────────────────────────────────────────────────────────────────────────

async function getFlowDataAccrual(
  supabase: any,
  filters: AnalyticsFilters
): Promise<FlowData> {
  // Buscar dados de v_charges_monthly (apenas despesas, receitas não têm competência)
  const { data, error } = await supabase
    .from('v_charges_monthly')
    .select('statement_month, charges_total_cents')
    .eq('user_id', filters.userId)
    .gte('statement_month', filters.dateRange.from.slice(0, 7))
    .lte('statement_month', filters.dateRange.to.slice(0, 7))
    .order('statement_month', { ascending: true });

  if (error) throw error;

  // Agrupar por mês (apenas despesas)
  const grouped: FlowDataPoint[] = (data || []).map((row: any) => ({
    month: row.statement_month,
    incomeCents: 0, // Receitas não têm competência
    expenseCents: row.charges_total_cents,
    netCents: -row.charges_total_cents, // Negativo
  }));

  // Preencher meses vazios
  const filled = fillMissingMonths(grouped, filters.dateRange.from.slice(0, 7), filters.dateRange.to.slice(0, 7));

  // Calcular médias móveis
  const expenseValues = filled.map((g) => g.expenseCents);
  const netValues = filled.map((g) => g.netCents);

  const expenseMA = calculateMovingAverage(expenseValues, 3);
  const netMA = calculateMovingAverage(netValues, 3);

  // Detectar outliers
  const outliers = detectOutliers(filled);

  return {
    series: filled,
    movingAverage: {
      income: [], // Não aplicável em competência
      expense: expenseMA,
      net: netMA,
    },
    outliers,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function groupByMonth(data: any[]): FlowDataPoint[] {
  const grouped = new Map<string, { income: number; expense: number }>();

  data.forEach((row) => {
    const month = row.year_month;
    const existing = grouped.get(month) || { income: 0, expense: 0 };

    if (row.type === 'income') {
      existing.income += row.total_cents;
    } else if (row.type === 'expense') {
      existing.expense += row.total_cents;
    }

    grouped.set(month, existing);
  });

  return Array.from(grouped.entries())
    .map(([month, values]) => ({
      month,
      incomeCents: values.income,
      expenseCents: values.expense,
      netCents: values.income - values.expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function fillMissingMonths(
  data: FlowDataPoint[],
  fromMonth: string,
  toMonth: string
): FlowDataPoint[] {
  const result: FlowDataPoint[] = [];
  const existing = new Map(data.map((d) => [d.month, d]));

  let current = fromMonth;
  while (current <= toMonth) {
    result.push(
      existing.get(current) || {
        month: current,
        incomeCents: 0,
        expenseCents: 0,
        netCents: 0,
      }
    );

    // Próximo mês
    const [year, month] = current.split('-').map(Number);
    const nextDate = new Date(year, month, 1); // month é 0-indexed
    current = nextDate.toISOString().slice(0, 7);
  }

  return result;
}

function detectOutliers(data: FlowDataPoint[]): FlowData['outliers'] {
  const outliers: FlowData['outliers'] = [];

  // Calcular média e stddev de despesas
  const expenseValues = data.map((d) => d.expenseCents);
  const avgExpense = expenseValues.reduce((sum, val) => sum + val, 0) / expenseValues.length;
  const stddevExpense = Math.sqrt(
    expenseValues.reduce((sum, val) => sum + Math.pow(val - avgExpense, 2), 0) / expenseValues.length
  );

  // Detectar outliers (> 2 stddev)
  data.forEach((d) => {
    const deviation = (d.expenseCents - avgExpense) / stddevExpense;
    if (Math.abs(deviation) > 2) {
      outliers.push({
        month: d.month,
        type: 'expense',
        value: d.expenseCents,
        deviation,
      });
    }
  });

  return outliers;
}

