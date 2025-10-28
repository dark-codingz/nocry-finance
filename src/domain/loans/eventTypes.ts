// ============================================================================
// Domain: Loan Event Types (Tipos de Eventos de Empréstimos)
// ============================================================================
// PROPÓSITO:
// - Centralizar os tipos válidos de eventos de empréstimos
// - Garantir type-safety em todo o sistema
// - Single source of truth para validações (Zod, TypeScript, SQL)
// ============================================================================

/**
 * Tipos de eventos de empréstimos permitidos
 * - DISBURSEMENT: Desembolso inicial do empréstimo
 * - TOPUP: Novo aporte / empréstimo adicional
 * - REPAYMENT: Pagamento recebido do devedor
 * - INTEREST: Juros aplicados (manual ou automático)
 */
export const LOAN_EVENT_TYPES = {
  DISBURSEMENT: "disbursement",
  TOPUP: "topup",
  REPAYMENT: "repayment",
  INTEREST: "interest",
} as const;

/**
 * Type union dos tipos válidos de eventos
 */
export type LoanEventType =
  | typeof LOAN_EVENT_TYPES.DISBURSEMENT
  | typeof LOAN_EVENT_TYPES.TOPUP
  | typeof LOAN_EVENT_TYPES.REPAYMENT
  | typeof LOAN_EVENT_TYPES.INTEREST;

/**
 * Array com todos os tipos válidos (útil para Zod enums e validações)
 */
export const LOAN_EVENT_TYPE_VALUES = Object.values(LOAN_EVENT_TYPES) as [
  LoanEventType,
  ...LoanEventType[]
];

/**
 * Labels amigáveis para exibição na UI
 */
export const LOAN_EVENT_TYPE_LABELS: Record<LoanEventType, string> = {
  [LOAN_EVENT_TYPES.DISBURSEMENT]: "Desembolso",
  [LOAN_EVENT_TYPES.TOPUP]: "Novo Aporte",
  [LOAN_EVENT_TYPES.REPAYMENT]: "Pagamento Recebido",
  [LOAN_EVENT_TYPES.INTEREST]: "Juros",
};

/**
 * Ícones/emojis para cada tipo (opcional, para UI)
 */
export const LOAN_EVENT_TYPE_ICONS: Record<LoanEventType, string> = {
  [LOAN_EVENT_TYPES.DISBURSEMENT]: "💸",
  [LOAN_EVENT_TYPES.TOPUP]: "➕",
  [LOAN_EVENT_TYPES.REPAYMENT]: "💰",
  [LOAN_EVENT_TYPES.INTEREST]: "📈",
};

/**
 * Cores para cada tipo de evento (para UI)
 */
export const LOAN_EVENT_TYPE_COLORS: Record<LoanEventType, string> = {
  [LOAN_EVENT_TYPES.DISBURSEMENT]: "#D4AF37", // Ouro (saída de dinheiro)
  [LOAN_EVENT_TYPES.TOPUP]: "#FFA500", // Laranja (novo empréstimo)
  [LOAN_EVENT_TYPES.REPAYMENT]: "#10B981", // Verde (entrada de dinheiro)
  [LOAN_EVENT_TYPES.INTEREST]: "#6366F1", // Azul (juros)
};




