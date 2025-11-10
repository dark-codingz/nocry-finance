// ============================================================================
// lib/analytics/formulas.ts - Fórmulas de KPIs e Cálculos
// ============================================================================
// PROPÓSITO:
// - Centralizar todas as fórmulas de KPIs
// - Garantir consistência nos cálculos
// - Facilitar testes unitários
//
// KPIS IMPLEMENTADOS:
// - Savings Ratio (Taxa de Poupança)
// - DTI (Debt-to-Income)
// - Emergência (Meses de Reserva)
// - Runway (Pista de Liquidez)
// - Utilização de Crédito
// - Variação MoM/YoY
// - Run-rate (Projeção do Mês)
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type KpiValue = {
  value: number;
  formatted: string;
  badge: 'success' | 'warning' | 'danger' | 'neutral';
};

// ────────────────────────────────────────────────────────────────────────────
// 1. SAVINGS RATIO (Taxa de Poupança)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a Taxa de Poupança (Savings Ratio)
 * 
 * @param incomeCents - Receitas totais (centavos)
 * @param savingsCents - Poupança/Investimentos (centavos)
 * @returns Percentual de poupança (0-100)
 * 
 * Formula: (savingsCents / incomeCents) * 100
 * 
 * Interpretação:
 * - >= 20%: Verde (excelente)
 * - 10-20%: Amarelo (bom)
 * - < 10%: Vermelho (atenção)
 * 
 * @example
 * calculateSavingsRatio({ incomeCents: 500000, savingsCents: 100000 })
 * // => 20.0
 */
export function calculateSavingsRatio(params: {
  incomeCents: number;
  savingsCents: number;
}): number {
  if (params.incomeCents === 0) return 0;
  return (params.savingsCents / params.incomeCents) * 100;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. DTI (Debt-to-Income Ratio)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o Índice de Endividamento (DTI - Debt-to-Income)
 * 
 * @param incomeCents - Receitas totais (centavos)
 * @param debtPaymentsCents - Pagamentos de dívida (centavos)
 * @returns Percentual de endividamento (0-100+)
 * 
 * Formula: (debtPaymentsCents / incomeCents) * 100
 * 
 * Interpretação:
 * - < 20%: Verde (saudável)
 * - 20-40%: Amarelo (atenção)
 * - > 40%: Vermelho (crítico)
 * 
 * @example
 * calculateDTI({ incomeCents: 500000, debtPaymentsCents: 150000 })
 * // => 30.0
 */
export function calculateDTI(params: {
  incomeCents: number;
  debtPaymentsCents: number;
}): number {
  if (params.incomeCents === 0) return 0;
  return (params.debtPaymentsCents / params.incomeCents) * 100;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. EMERGÊNCIA (Meses de Reserva)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula quantos meses de despesa a reserva cobre
 * 
 * @param reserveCents - Reserva de emergência (centavos)
 * @param avgMonthlyExpenseCents - Despesa mensal média (centavos)
 * @returns Quantidade de meses cobertos
 * 
 * Formula: reserveCents / avgMonthlyExpenseCents
 * 
 * Interpretação:
 * - >= 6 meses: Verde (seguro)
 * - 3-6 meses: Amarelo (ok)
 * - < 3 meses: Vermelho (risco)
 * 
 * @example
 * calculateEmergencyMonths({ reserveCents: 1500000, avgMonthlyExpenseCents: 300000 })
 * // => 5.0
 */
export function calculateEmergencyMonths(params: {
  reserveCents: number;
  avgMonthlyExpenseCents: number;
}): number {
  if (params.avgMonthlyExpenseCents === 0) return 0;
  return params.reserveCents / params.avgMonthlyExpenseCents;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. RUNWAY (Pista de Liquidez)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula quantos meses a liquidez atual sustenta (burn rate)
 * 
 * @param liquidAssetsCents - Ativos líquidos totais (centavos)
 * @param avgMonthlyBurnCents - Queima mensal média (centavos)
 * @returns Quantidade de meses de runway
 * 
 * Formula: liquidAssetsCents / avgMonthlyBurnCents
 * 
 * Interpretação:
 * - >= 12 meses: Verde (excelente)
 * - 6-12 meses: Amarelo (bom)
 * - < 6 meses: Vermelho (atenção)
 * 
 * @example
 * calculateRunway({ liquidAssetsCents: 3000000, avgMonthlyBurnCents: 250000 })
 * // => 12.0
 */
export function calculateRunway(params: {
  liquidAssetsCents: number;
  avgMonthlyBurnCents: number;
}): number {
  if (params.avgMonthlyBurnCents === 0) return Infinity;
  return params.liquidAssetsCents / params.avgMonthlyBurnCents;
}

// ────────────────────────────────────────────────────────────────────────────
// 5. UTILIZAÇÃO DE CRÉDITO
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o percentual de utilização do limite de crédito
 * 
 * @param usedCents - Valor usado (centavos)
 * @param limitCents - Limite total (centavos)
 * @returns Percentual de utilização (0-100+)
 * 
 * Formula: (usedCents / limitCents) * 100
 * 
 * Interpretação:
 * - < 30%: Verde (saudável)
 * - 30-60%: Amarelo (atenção)
 * - > 60%: Vermelho (alto)
 * 
 * @example
 * calculateCreditUtilization({ usedCents: 150000, limitCents: 500000 })
 * // => 30.0
 */
export function calculateCreditUtilization(params: {
  usedCents: number;
  limitCents: number;
}): number {
  if (params.limitCents === 0) return 0;
  return (params.usedCents / params.limitCents) * 100;
}

// ────────────────────────────────────────────────────────────────────────────
// 6. VARIAÇÃO MoM (Month-over-Month)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a variação percentual entre dois períodos
 * 
 * @param current - Valor atual
 * @param previous - Valor anterior
 * @returns Percentual de variação (-100 a +infinito)
 * 
 * Formula: ((current - previous) / previous) * 100
 * 
 * @example
 * calculateMoM(120000, 100000) => 20.0 (aumento de 20%)
 * calculateMoM(80000, 100000) => -20.0 (redução de 20%)
 */
export function calculateMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Alias para MoM (Year-over-Year usa a mesma fórmula)
 */
export const calculateYoY = calculateMoM;

// ────────────────────────────────────────────────────────────────────────────
// 7. RUN-RATE (Projeção do Mês)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Projeta o total do mês baseado no acumulado até hoje
 * 
 * @param accumulatedCents - Valor acumulado até hoje (centavos)
 * @param currentDayOfMonth - Dia atual do mês (1-31)
 * @param daysInMonth - Total de dias no mês (28-31)
 * @returns Projeção do total do mês (centavos)
 * 
 * Formula: (accumulatedCents / currentDayOfMonth) * daysInMonth
 * 
 * @example
 * calculateRunRate({ accumulatedCents: 100000, currentDayOfMonth: 10, daysInMonth: 30 })
 * // => 300000 (projeção: R$ 3.000)
 */
export function calculateRunRate(params: {
  accumulatedCents: number;
  currentDayOfMonth: number;
  daysInMonth: number;
}): number {
  if (params.currentDayOfMonth === 0) return 0;
  return (params.accumulatedCents / params.currentDayOfMonth) * params.daysInMonth;
}

// ────────────────────────────────────────────────────────────────────────────
// 8. MÉDIA MÓVEL (Moving Average)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula média móvel de N períodos
 * 
 * @param values - Array de valores
 * @param window - Janela de períodos (ex: 3 para MA3)
 * @returns Array com médias móveis (mesmo tamanho que input)
 * 
 * @example
 * calculateMovingAverage([10, 20, 30, 40, 50], 3)
 * // => [10, 15, 20, 30, 40]
 */
export function calculateMovingAverage(
  values: number[],
  window: number = 3
): number[] {
  if (values.length === 0) return [];
  if (window <= 0) return values;
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }
  
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// 9. PERCENTUAL ACUMULADO (Pareto)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o percentual acumulado para análise de Pareto
 * 
 * @param values - Array de valores (já ordenados decrescente)
 * @returns Array com percentuais acumulados (0-100)
 * 
 * @example
 * calculateCumulativePercentage([50, 30, 15, 5])
 * // => [50, 80, 95, 100]
 */
export function calculateCumulativePercentage(values: number[]): number[] {
  const total = values.reduce((sum, val) => sum + val, 0);
  if (total === 0) return values.map(() => 0);
  
  let accumulated = 0;
  return values.map((val) => {
    accumulated += val;
    return (accumulated / total) * 100;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 10. UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determina o badge de status baseado em valor e thresholds
 */
export function getBadge(
  value: number,
  thresholds: { success: number; warning: number },
  inverted: boolean = false
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (inverted) {
    // Menor é melhor (ex: DTI)
    if (value <= thresholds.success) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'danger';
  } else {
    // Maior é melhor (ex: Savings Ratio)
    if (value >= thresholds.success) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'danger';
  }
}

/**
 * Formata número para percentual
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formata número para meses
 */
export function formatMonths(value: number, decimals: number = 1): string {
  if (value === Infinity) return '∞ meses';
  const months = value.toFixed(decimals);
  return `${months} ${value === 1 ? 'mês' : 'meses'}`;
}

