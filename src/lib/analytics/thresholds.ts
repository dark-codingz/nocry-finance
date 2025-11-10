// ============================================================================
// lib/analytics/thresholds.ts - Thresholds Configuráveis para KPIs
// ============================================================================
// PROPÓSITO:
// - Centralizar thresholds para badges de status
// - Permitir customização futura por usuário
// - Documentar valores de referência
//
// BADGES:
// - success: Verde (ótimo)
// - warning: Amarelo (atenção)
// - danger: Vermelho (crítico)
// - neutral: Cinza (sem dados)
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type BadgeType = 'success' | 'warning' | 'danger' | 'neutral';

export type ThresholdConfig = {
  success: number; // Limite para badge verde
  warning: number; // Limite para badge amarelo
  inverted: boolean; // Se true, menor é melhor (ex: DTI)
};

// ────────────────────────────────────────────────────────────────────────────
// THRESHOLDS PADRÃO
// ────────────────────────────────────────────────────────────────────────────

/**
 * Thresholds para Savings Ratio (Taxa de Poupança)
 * 
 * Interpretação:
 * - >= 20%: Verde (excelente hábito de poupança)
 * - 10-20%: Amarelo (bom, mas pode melhorar)
 * - < 10%: Vermelho (atenção, pouca poupança)
 * 
 * Referência: Especialistas recomendam 20% mínimo
 */
export const SAVINGS_RATIO_THRESHOLDS: ThresholdConfig = {
  success: 20, // >= 20% = Verde
  warning: 10, // >= 10% = Amarelo
  inverted: false, // Maior é melhor
};

/**
 * Thresholds para DTI (Debt-to-Income Ratio)
 * 
 * Interpretação:
 * - <= 20%: Verde (endividamento saudável)
 * - 20-40%: Amarelo (atenção ao endividamento)
 * - > 40%: Vermelho (endividamento crítico)
 * 
 * Referência: Bancos consideram até 30% aceitável
 */
export const DTI_THRESHOLDS: ThresholdConfig = {
  success: 20, // <= 20% = Verde
  warning: 40, // <= 40% = Amarelo
  inverted: true, // Menor é melhor
};

/**
 * Thresholds para Emergência (Meses de Reserva)
 * 
 * Interpretação:
 * - >= 6 meses: Verde (reserva segura)
 * - 3-6 meses: Amarelo (reserva adequada)
 * - < 3 meses: Vermelho (reserva insuficiente)
 * 
 * Referência: Especialistas recomendam 6 meses mínimo
 */
export const EMERGENCY_THRESHOLDS: ThresholdConfig = {
  success: 6, // >= 6 meses = Verde
  warning: 3, // >= 3 meses = Amarelo
  inverted: false, // Maior é melhor
};

/**
 * Thresholds para Runway (Pista de Liquidez)
 * 
 * Interpretação:
 * - >= 12 meses: Verde (liquidez excelente)
 * - 6-12 meses: Amarelo (liquidez boa)
 * - < 6 meses: Vermelho (liquidez baixa)
 * 
 * Referência: Ideal para freelancers/empreendedores
 */
export const RUNWAY_THRESHOLDS: ThresholdConfig = {
  success: 12, // >= 12 meses = Verde
  warning: 6, // >= 6 meses = Amarelo
  inverted: false, // Maior é melhor
};

/**
 * Thresholds para Utilização de Crédito
 * 
 * Interpretação:
 * - <= 30%: Verde (utilização saudável)
 * - 30-60%: Amarelo (atenção à utilização)
 * - > 60%: Vermelho (utilização alta, impacta score)
 * 
 * Referência: Score de crédito é afetado acima de 30%
 */
export const CREDIT_UTILIZATION_THRESHOLDS: ThresholdConfig = {
  success: 30, // <= 30% = Verde
  warning: 60, // <= 60% = Amarelo
  inverted: true, // Menor é melhor
};

/**
 * Thresholds para % Orçamento Consumido
 * 
 * Interpretação:
 * - <= 80%: Verde (dentro do orçamento)
 * - 80-100%: Amarelo (próximo do limite)
 * - > 100%: Vermelho (estouro de orçamento)
 */
export const BUDGET_CONSUMED_THRESHOLDS: ThresholdConfig = {
  success: 80, // <= 80% = Verde
  warning: 100, // <= 100% = Amarelo
  inverted: true, // Menor é melhor
};

// ────────────────────────────────────────────────────────────────────────────
// MAPA DE THRESHOLDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mapa de todos os thresholds por KPI
 */
export const THRESHOLDS: Record<string, ThresholdConfig> = {
  savingsRatio: SAVINGS_RATIO_THRESHOLDS,
  dti: DTI_THRESHOLDS,
  emergency: EMERGENCY_THRESHOLDS,
  runway: RUNWAY_THRESHOLDS,
  creditUtilization: CREDIT_UTILIZATION_THRESHOLDS,
  budgetConsumed: BUDGET_CONSUMED_THRESHOLDS,
};

// ────────────────────────────────────────────────────────────────────────────
// FUNÇÕES UTILITÁRIAS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determina o badge baseado no valor e threshold
 * 
 * @param value - Valor a avaliar
 * @param threshold - Configuração de threshold
 * @returns Badge type
 * 
 * @example
 * getBadgeType(25, SAVINGS_RATIO_THRESHOLDS) => 'success'
 * getBadgeType(15, SAVINGS_RATIO_THRESHOLDS) => 'warning'
 * getBadgeType(5, SAVINGS_RATIO_THRESHOLDS) => 'danger'
 */
export function getBadgeType(
  value: number,
  threshold: ThresholdConfig
): BadgeType {
  // Tratar valores inválidos
  if (isNaN(value) || value === null || value === undefined) {
    return 'neutral';
  }
  
  if (threshold.inverted) {
    // Menor é melhor (ex: DTI, Utilização de Crédito)
    if (value <= threshold.success) return 'success';
    if (value <= threshold.warning) return 'warning';
    return 'danger';
  } else {
    // Maior é melhor (ex: Savings Ratio, Emergência)
    if (value >= threshold.success) return 'success';
    if (value >= threshold.warning) return 'warning';
    return 'danger';
  }
}

/**
 * Retorna cor Tailwind CSS para o badge
 * 
 * @param badge - Tipo de badge
 * @returns Classes Tailwind
 */
export function getBadgeColor(badge: BadgeType): string {
  switch (badge) {
    case 'success':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'danger':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'neutral':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Retorna ícone emoji para o badge
 * 
 * @param badge - Tipo de badge
 * @returns Emoji
 */
export function getBadgeEmoji(badge: BadgeType): string {
  switch (badge) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'danger':
      return '🔴';
    case 'neutral':
      return '⚪';
  }
}

/**
 * Retorna descrição textual para o badge
 * 
 * @param badge - Tipo de badge
 * @returns Descrição
 */
export function getBadgeLabel(badge: BadgeType): string {
  switch (badge) {
    case 'success':
      return 'Excelente';
    case 'warning':
      return 'Atenção';
    case 'danger':
      return 'Crítico';
    case 'neutral':
      return 'Sem dados';
  }
}

