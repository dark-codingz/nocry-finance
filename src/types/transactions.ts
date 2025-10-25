// ============================================================================
// Transaction Types & Schemas - NoCry Finance
// ============================================================================
// Propósito: Centralizar types e validação Zod para transações financeiras.
//
// CONVERSÃO DE VALORES:
// - Input do usuário: string ("435,00", "1.200,50") ou number
// - Schema Zod: transforma para centavos (number) usando toCents()
// - Saída do schema: sempre number (centavos)
// - Banco de dados: bigint (centavos)
//
// REGRAS DE NEGÓCIO:
// 1. Expense/Income: account_id XOR card_id (um ou outro, não ambos)
// 2. Transfer: account_id (origem) + transferToAccountId (destino), diferentes
// 3. Valores: sempre positivos (> 0)
//
// EVOLUÇÃO FUTURA:
// - Adicionar validação de limites (ex: não permitir despesa > saldo)
// - Validar categoria compatível com tipo (expense/income)
// - Adicionar suporte para parcelamento
// ============================================================================

import { z } from 'zod';
import { toCents } from '@/lib/money';

// ============================================================================
// Schema Base: Transação
// ============================================================================

/**
 * Schema Zod para validação de transações financeiras.
 * 
 * TRANSFORMAÇÕES:
 * - amount: string/number → centavos (number) via toCents()
 * - occurredAt: string → Date
 * 
 * VALIDAÇÕES:
 * - amount: deve ser > 0 (não permite valores negativos ou zero)
 * - accountId/cardId: XOR para expense/income
 * - accountId/transferToAccountId: diferentes para transfer
 * 
 * RETORNO:
 * - TransactionFormData com amount sempre em centavos (number)
 */
export const transactionSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────
  // Campos Básicos
  // ─────────────────────────────────────────────────────────────────────
  type: z.enum(['expense', 'income', 'transfer'], {
    errorMap: () => ({ message: 'Tipo inválido' }),
  }),

  /**
   * Valor da transação.
   * 
   * ACEITA:
   * - string: "435,00", "1.200,50", "R$ 1.234,56"
   * - number: 435, 1200.5, 1234.56
   * 
   * TRANSFORMA:
   * - Para centavos (number): 43500, 120050, 123456
   * 
   * VALIDA:
   * - Deve ser > 0
   * - Deve ser conversível (não NaN)
   */
  amount: z.union([z.string(), z.number()])
    .transform((value) => {
      const cents = toCents(value as string | number);
      
      if (Number.isNaN(cents)) {
        throw new Error('Valor inválido. Use o formato: 1.234,56');
      }
      
      if (cents <= 0) {
        throw new Error('Valor deve ser maior que zero');
      }
      
      return cents;
    }),

  /**
   * Data da transação (quando ocorreu).
   * 
   * ACEITA:
   * - string: "2025-01-15", "2025-01-15T10:30:00"
   * - Date: new Date()
   * 
   * TRANSFORMA:
   * - Para Date object
   */
  occurredAt: z.preprocess(
    (value) => (typeof value === 'string' ? new Date(value) : value),
    z.date({
      errorMap: () => ({ message: 'Data inválida' }),
    })
  ),

  description: z.string().trim().max(500, 'Descrição muito longa').optional(),

  // ─────────────────────────────────────────────────────────────────────
  // Relacionamentos (UUIDs ou null)
  // ─────────────────────────────────────────────────────────────────────
  accountId: z.string().uuid('ID de conta inválido').optional().nullable(),
  cardId: z.string().uuid('ID de cartão inválido').optional().nullable(),
  categoryId: z.string().uuid('ID de categoria inválido').optional().nullable(),

  // ─────────────────────────────────────────────────────────────────────
  // Transferências
  // ─────────────────────────────────────────────────────────────────────
  transferToAccountId: z.string().uuid('ID de conta de destino inválido').optional().nullable(),
})
.superRefine((data, ctx) => {
  // ═══════════════════════════════════════════════════════════════════
  // Regra 1: Expense/Income → account XOR card (um ou outro, não ambos)
  // ═══════════════════════════════════════════════════════════════════
  if (data.type !== 'transfer') {
    const hasAccount = !!data.accountId;
    const hasCard = !!data.cardId;

    // Ambos preenchidos ou ambos vazios → erro
    if (hasAccount === hasCard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: 'Selecione uma conta OU um cartão (não ambos)',
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cardId'],
        message: 'Selecione uma conta OU um cartão (não ambos)',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Regra 2: Transfer → contas de origem e destino diferentes
  // ═══════════════════════════════════════════════════════════════════
  if (data.type === 'transfer') {
    const hasOrigin = !!data.accountId;
    const hasDestination = !!data.transferToAccountId;

    // Faltando origem ou destino
    if (!hasOrigin || !hasDestination) {
      if (!hasOrigin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accountId'],
          message: 'Selecione a conta de origem',
        });
      }
      if (!hasDestination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transferToAccountId'],
          message: 'Selecione a conta de destino',
        });
      }
      return;
    }

    // Origem e destino iguais
    if (data.accountId === data.transferToAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferToAccountId'],
        message: 'As contas de origem e destino devem ser diferentes',
      });
    }
  }
});

// ============================================================================
// Types Inferidos
// ============================================================================

/**
 * Tipo inferido do schema de transação.
 * 
 * IMPORTANTE:
 * - amount: sempre number (centavos) após validação
 * - occurredAt: sempre Date object
 * - UUIDs: string | null | undefined
 */
export type TransactionFormData = z.infer<typeof transactionSchema>;

/**
 * Tipo para criação de transação no serviço.
 * 
 * Simplifica o tipo removendo opcionais e garantindo que todos os campos
 * necessários estão presentes.
 */
export type CreateTransactionInput = {
  type: 'expense' | 'income' | 'transfer';
  amount: number;              // centavos
  occurredAt: Date;
  description?: string;
  accountId?: string | null;
  cardId?: string | null;
  categoryId?: string | null;
  transferToAccountId?: string | null;
};




