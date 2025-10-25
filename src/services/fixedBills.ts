// src/services/fixedBills.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import { clampDay } from '@/lib/dateSafe';

// Propósito: Centralizar as operações de CRUD e lançamento automático de despesas fixas recorrentes.

export interface FixedBill {
  id: string;
  user_id: string;
  name: string;
  amount_cents: number;
  day_of_month: number;
  account_id: string | null;
  card_id: string | null;
  is_active: boolean;
  last_run_month: string | null;
  created_at: string;
}

/**
 * Lista todas as despesas fixas do usuário.
 */
export async function listFixedBills(supabase: SupabaseClient, userId: string): Promise<FixedBill[]> {
  if (!userId) throw new Error('Usuário não autenticado.');

  const { data, error } = await supabase
    .from('fixed_bills')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw new Error(`Erro ao listar fixas: ${error.message}`);
  return data || [];
}

/**
 * Atualiza uma despesa fixa existente.
 * Permite editar: name, amount_cents, day_of_month, account_id, card_id, is_active.
 */
export async function updateFixedBill(
  supabase: SupabaseClient,
  userId: string,
  params: {
    id: string;
    name?: string;
    amount_cents?: number;
    day_of_month?: number;
    account_id?: string | null;
    card_id?: string | null;
    is_active?: boolean;
  }
): Promise<FixedBill> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (!params.id) throw new Error('ID da fixa é obrigatório.');

  const { id, ...updates } = params;

  // Remove campos undefined para não sobrescrever com null
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from('fixed_bills')
    .update(cleanUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar fixa: ${error.message}`);
  return data;
}

/**
 * Lança automaticamente as despesas fixas ativas do mês especificado.
 * 
 * Regras:
 * - Para cada fixa ativa, cria uma transação do tipo 'expense'.
 * - Respeita o day_of_month (com clamp para dias inválidos no mês).
 * - Evita duplicidade verificando se já existe uma transação com description "[FIXA] {name}" no dia.
 * - Atualiza o campo last_run_month com o mês processado.
 * 
 * @returns Número de fixas que foram efetivamente lançadas.
 */
export async function runFixedForMonth(
  supabase: SupabaseClient,
  userId: string,
  monthStr: string // formato 'YYYY-MM'
): Promise<number> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new Error('Formato de mês inválido. Use YYYY-MM.');

  // Busca todas as fixas ativas do usuário
  const { data: bills, error: billsError } = await supabase
    .from('fixed_bills')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (billsError) throw new Error(`Erro ao buscar fixas: ${billsError.message}`);
  if (!bills || bills.length === 0) return 0;

  const [year, month] = monthStr.split('-').map(Number);
  let created = 0;

  for (const bill of bills) {
    try {
      // Calcula a data do lançamento (com clamp para dias inválidos)
      const day = clampDay(year, month, bill.day_of_month);
      const occurredAt = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const description = `[FIXA] ${bill.name}`;

      // Verifica duplicidade: já existe transação com a mesma descrição no mesmo dia?
      const { data: existing, error: checkError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('description', description)
        .eq('occurred_at', occurredAt)
        .maybeSingle();

      if (checkError) {
        console.warn(`[fixedBills] Erro ao verificar duplicidade para ${bill.name}:`, checkError.message);
        continue;
      }

      if (existing) {
        console.log(`[fixedBills] Fixa "${bill.name}" já lançada em ${occurredAt}. Pulando.`);
        continue;
      }

      // Cria a transação
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'expense',
          account_id: bill.account_id,
          card_id: bill.card_id,
          amount_cents: bill.amount_cents,
          occurred_at: occurredAt,
          description,
        });

      if (insertError) {
        console.warn(`[fixedBills] Erro ao criar transação para ${bill.name}:`, insertError.message);
        continue;
      }

      // Atualiza o last_run_month da fixa
      await supabase
        .from('fixed_bills')
        .update({ last_run_month: monthStr })
        .eq('id', bill.id)
        .eq('user_id', userId);

      created++;
      console.log(`[fixedBills] Fixa "${bill.name}" lançada com sucesso em ${occurredAt}.`);
    } catch (err: any) {
      console.error(`[fixedBills] Erro ao processar fixa ${bill.name}:`, err.message);
    }
  }

  return created;
}




