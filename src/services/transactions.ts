// ============================================================================
// transactions.ts - Service para Transações e Parcelamento
// ============================================================================
// PROPÓSITO:
// - Criar transações únicas ou parceladas
// - Gerenciar compras parceladas no cartão (1x até 12x)
// - Integração com RPC do Supabase
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
export interface CreateInstallmentsInput {
  card_id: string;
  category_id: string | null;
  description: string;
  first_date: string; // YYYY-MM-DD (ORDEM CORRIGIDA)
  num_installments: number; // 1..12
  start_next_invoice?: boolean;
  total_cents: number; // TOTAL POR ÚLTIMO
}

export interface InstallmentsResult {
  transfer_group_id: string;
  created_ids: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Criar Parcelas no Cartão
// ────────────────────────────────────────────────────────────────────────────
/**
 * Cria N parcelas de uma compra no cartão.
 * 
 * @param input - Dados da compra parcelada
 * @returns Grupo de parcelas e IDs criados
 * 
 * @example
 * ```ts
 * const result = await createCardInstallments({
 *   card_id: 'uuid-do-cartao',
 *   category_id: 'uuid-categoria',
 *   description: 'Notebook Dell',
 *   total_cents: 240000, // R$ 2.400,00
 *   first_date: '2025-01-15',
 *   num_installments: 12,
 *   start_next_invoice: false
 * });
 * // Cria 12 transações de R$ 200,00 cada
 * ```
 */
export async function createCardInstallments(
  input: CreateInstallmentsInput
): Promise<InstallmentsResult> {
  const sb = createSupabaseBrowser();

  // Chamar RPC com parâmetro JSON único (sintaxe inline)
  const { data, error } = await sb.rpc('create_card_installments', {
    p: {
      card_id: input.card_id,
      category_id: input.category_id,              // pode ser null
      description: input.description,
      first_date: input.first_date,
      num_installments: input.num_installments,
      start_next_invoice: !!input.start_next_invoice,
      total_cents: input.total_cents,
    },
  });

  if (error) throw new Error(error.message || 'Falha em create_card_installments');

  return data[0] as InstallmentsResult;
}

// ────────────────────────────────────────────────────────────────────────────
// Listar Transações de um Grupo (Parcelas)
// ────────────────────────────────────────────────────────────────────────────
export async function listTransactionsByGroup(
  transferGroupId: string
): Promise<any[]> {
  const sb = createSupabaseBrowser();

  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .eq('transfer_group_id', transferGroupId)
    .order('installment_index', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

