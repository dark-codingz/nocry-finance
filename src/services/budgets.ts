// src/services/budgets.ts
// ============================================================================
// Services: Budgets
// ============================================================================
// PROPÓSITO:
// - Centralizar operações de leitura e escrita de orçamentos mensais
// - saveBudget: Função unificada que usa RPC (segura, com auth.uid())
// - getBudget/setBudget: Funções legadas (manter por compatibilidade)
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import dayjs from 'dayjs';

// Propósito: Centralizar as operações de leitura e escrita de orçamentos mensais.

export interface Budget {
  id: string;
  user_id: string;
  month: string; // 'YYYY-MM'
  amount_cents: number;
  created_at: string;
}

export interface MonthlyBudget {
  id: string | null;
  month_key: string;
  amount_cents: number; // sempre number (0 se não definido)
}

/**
 * Busca o orçamento definido para um mês específico.
 * @returns O orçamento do mês, ou null se não houver.
 */
export async function getBudget(
  supabase: SupabaseClient,
  userId: string,
  monthStr: string
): Promise<{ amountCents: number } | null> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new Error('Formato de mês inválido. Use YYYY-MM.');

  const { data, error } = await supabase
    .from('budgets')
    .select('amount_cents')
    .eq('user_id', userId)
    .eq('month', monthStr)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar orçamento: ${error.message}`);
  if (!data) return null;

  return { amountCents: data.amount_cents };
}

/**
 * Busca o orçamento definido para um mês específico com defaults seguros.
 * SEMPRE retorna um objeto (nunca null), com amount_cents = 0 se não houver orçamento.
 * 
 * @returns Orçamento com defaults seguros
 */
export async function getBudgetSafe(
  supabase: SupabaseClient,
  userId: string,
  monthStr: string
): Promise<MonthlyBudget> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new Error('Formato de mês inválido. Use YYYY-MM.');

  const { data, error } = await supabase
    .from('budgets')
    .select('id, month, amount_cents')
    .eq('user_id', userId)
    .eq('month', monthStr)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar orçamento: ${error.message}`);

  // Sempre retornar objeto com defaults
  return {
    id: data?.id ?? null,
    month_key: monthStr,
    amount_cents: typeof data?.amount_cents === 'number' ? data.amount_cents : 0,
  };
}

/**
 * Define (cria ou atualiza) o orçamento para um mês.
 * Utiliza upsert para evitar duplicidade pela unique constraint (user_id, month).
 */
export async function setBudget(
  supabase: SupabaseClient,
  userId: string,
  params: { monthStr: string; amountCents: number }
): Promise<void> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (!/^\d{4}-\d{2}$/.test(params.monthStr)) throw new Error('Formato de mês inválido. Use YYYY-MM.');
  if (!Number.isFinite(params.amountCents) || params.amountCents <= 0) throw new Error('O valor do orçamento deve ser positivo.');

  const { error } = await supabase
    .from('budgets')
    .upsert(
      {
        user_id: userId,
        month: params.monthStr,
        amount_cents: params.amountCents,
      },
      { onConflict: 'user_id,month' }
    );

  if (error) throw new Error(`Erro ao salvar orçamento: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// getBudgetForMonth - Buscar orçamento de um mês específico (RQ-friendly)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Busca o orçamento de um mês específico (otimizado para React Query).
 * 
 * @param monthKey - Mês no formato YYYY-MM (default: mês atual)
 * @returns Objeto com data/error do Supabase (throw manual se error)
 * 
 * @example
 * ```ts
 * const { data, error } = await getBudgetForMonth('2025-10');
 * if (error) throw error;
 * console.log(data?.amount_cents);
 * ```
 */
export async function getBudgetForMonth(monthKey?: string) {
  const supabase = createSupabaseBrowser();
  const key = monthKey ?? dayjs().format('YYYY-MM');
  
  return await supabase
    .from('budgets')
    .select('id, amount_cents, month_key, updated_at')
    .eq('month_key', key)
    .maybeSingle(); // Usa maybeSingle para não quebrar se não existir
}

// ────────────────────────────────────────────────────────────────────────────
// saveBudget - Função unificada usando RPC (RECOMENDADA)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Salva (cria ou atualiza) o orçamento mensal usando RPC seguro.
 * 
 * VANTAGENS:
 * - Usa auth.uid() no backend (seguro)
 * - Não precisa passar userId (RLS cuida)
 * - Idempotente (upsert automático)
 * 
 * @param params.amountCents - Valor do orçamento em centavos
 * @param params.monthKey - Mês no formato YYYY-MM (default: mês atual)
 * @returns Resultado do RPC
 * 
 * @example
 * ```ts
 * await saveBudget({ amountCents: 300000, monthKey: '2025-10' });
 * await saveBudget({ amountCents: 500000 }); // usa mês atual
 * ```
 */
export async function saveBudget({ 
  amountCents, 
  monthKey 
}: { 
  amountCents: number; 
  monthKey?: string; 
}) {
  const supabase = createSupabaseBrowser();
  
  // Usar mês atual se não fornecido
  const key = monthKey ?? dayjs().format('YYYY-MM');
  
  // Validar formato do mês
  if (!/^\d{4}-\d{2}$/.test(key)) {
    throw new Error('Formato de mês inválido. Use YYYY-MM.');
  }
  
  // Validar valor
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    throw new Error('O valor do orçamento deve ser positivo.');
  }
  
  // Chamar RPC (usa auth.uid() internamente)
  const { data, error } = await supabase.rpc('upsert_budget', {
    p_month_key: key,
    p_amount_cents: amountCents,
  });
  
  if (error) throw new Error(`Erro ao salvar orçamento: ${error.message}`);
  
  return data;
}

