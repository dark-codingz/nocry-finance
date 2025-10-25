// /src/services/financeDashboard.ts
// Nota: Valores monetários são sempre em centavos (bigint).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PFMonthSummary, InvoiceRow, NextFixedBill } from '@/types/financeDashboard';
import { getBudget } from './budgets';

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Utils
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function getMonthRange(monthStr?: string | null) {
  const now = new Date();
  const dateStr = monthStr ? `${monthStr}-15` : now.toISOString();
  const targetDate = new Date(dateStr);
  
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  
  const lastDayNum = new Date(y, m, 0).getDate();
  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay  = `${y}-${String(m).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
  
  return { firstDay, lastDay, y, m, lastDayNum };
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Service Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

/**
 * Busca o resumo financeiro de um mês (despesas, receitas, contas fixas, orçamento).
 * - Ignora transferências nos totais para não distorcer o saldo.
 * - Inclui o orçamento definido pelo usuário para o mês.
 */
export async function getPFMonthSummary(supabase: SupabaseClient, userId: string, monthStr: string): Promise<PFMonthSummary> {
  if (!userId) throw new Error('Usuário não autenticado.');

  const { firstDay, lastDay, lastDayNum } = getMonthRange(monthStr);

  const txPromise = supabase
    .from('transactions')
    .select('type, amount_cents')
    .eq('user_id', userId)
    .in('type', ['expense', 'income'])
    .gte('occurred_at', firstDay)
    .lte('occurred_at', lastDay);

  const billsPromise = supabase
    .from('fixed_bills')
    .select('amount_cents')
    .eq('user_id', userId)
    .is('is_active', true)
    .lte('day_of_month', lastDayNum);

  const budgetPromise = getBudget(supabase, userId, monthStr);

  const [txRes, billsRes, budget] = await Promise.all([txPromise, billsPromise, budgetPromise]);

  if (txRes.error) throw new Error(`Erro ao buscar transações: ${txRes.error.message}`);
  if (billsRes.error) throw new Error(`Erro ao buscar contas fixas: ${billsRes.error.message}`);

  const summary = (txRes.data || []).reduce((acc, tx) => {
    if (tx.type === 'expense') acc.totalExpenseCents += tx.amount_cents;
    if (tx.type === 'income') acc.totalIncomeCents += tx.amount_cents;
    return acc;
  }, { totalExpenseCents: 0, totalIncomeCents: 0 });

  const fixedBillsThisMonthCents = (billsRes.data || []).reduce((sum, bill) => sum + bill.amount_cents, 0);

  return {
    ...summary,
    netCents: summary.totalIncomeCents - summary.totalExpenseCents,
    fixedBillsThisMonthCents,
    budgetCents: budget?.amountCents || 0,
  };
}

/**
 * Busca as faturas atuais dos cartões de crédito.
 * Utiliza a view `card_invoices_current` que já aplica RLS.
 */
export async function getCurrentInvoices(supabase: SupabaseClient, userId: string): Promise<InvoiceRow[]> {
  if (!userId) throw new Error('Usuário não autenticado.');
  
  const { data, error } = await supabase.from('card_invoices_current').select('*');
  if (error) throw new Error(`Erro ao buscar faturas: ${error.message}`);
  
  return data ?? [];
}

/**
 * Calcula a próxima conta fixa a vencer a partir de hoje.
 * A lógica de data considera o timezone 'America/Sao_Paulo'.
 */
export async function getNextFixedBill(supabase: SupabaseClient, userId: string): Promise<NextFixedBill | null> {
    if (!userId) throw new Error('Usuário não autenticado.');

    const { data, error } = await supabase
        .from('fixed_bills')
        .select('name, amount_cents, day_of_month')
        .eq('user_id', userId)
        .is('is_active', true);
        
    if (error) throw new Error(`Erro ao buscar próximas contas: ${error.message}`);
    if (!data || data.length === 0) return null;

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let closestBill = null;
    let closestDate: Date | null = null;

    data.forEach(bill => {
        let billDate: Date;
        if (bill.day_of_month >= today) {
            billDate = new Date(currentYear, currentMonth, bill.day_of_month);
        } else {
            billDate = new Date(currentYear, currentMonth + 1, bill.day_of_month);
        }
        
        if (!closestDate || billDate < closestDate) {
            closestDate = billDate;
            closestBill = {
                name: bill.name,
                amountCents: bill.amount_cents,
                dateISO: closestDate.toISOString().slice(0, 10),
            };
        }
    });

    return closestBill;
}
