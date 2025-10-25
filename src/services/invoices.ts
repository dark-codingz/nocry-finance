// src/services/invoices.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { makeISO, todayISO, diffDays } from '@/lib/dateSafe';

// Motivação: Centralizar a lógica complexa de cálculo de ciclos de fatura
// e a regra de negócio para pagamento de faturas.
// A V2 desta função usa 'dateSafe' para evitar 'Invalid time value' e
// aplica defaults e try/catch para robustez.

// --- Tipos de Dados ---

interface CardCycle {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
  daysToDue?: number;
}

export interface CardWithCycles {
  cardId: string;
  name: string;
  closingDay: number;
  dueDay: number;
  current: CardCycle;
  closed: CardCycle | null;
}

// --- Funções de Serviço ---

/**
 * Calcula os ciclos de fatura (atual e fechado) para todos os cartões de um usuário.
 * A lógica de data é executada no lado do servidor/BFF para consistência.
 */
export async function getCardCycles(supabase: SupabaseClient, userId: string): Promise<CardWithCycles[]> {
  if (!userId) throw new Error('Usuário não autenticado.');

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, name, closing_day, due_day')
    .eq('user_id', userId);
  
  if (cardsError) throw new Error(`Erro ao buscar cartões: ${cardsError.message}`);
  
  const results: CardWithCycles[] = [];
  
  for (const card of (cards || [])) {
    try {
      const today = todayISO();
      const todayObj = dayjs(today);
      const currentYear = todayObj.year();
      const currentMonth = todayObj.month() + 1; // dayjs month é 0-indexed
      const todayDay = todayObj.date();

      // Regras e defaults seguros
      const closing_day = Number(card.closing_day) || 25;
      const due_day = Number(card.due_day) || Math.max(1, Math.min(28, closing_day + 10));

      // --- Cálculo do Ciclo Atual ---
      let currentEndYear = currentYear;
      let currentEndMonth = currentMonth;
      if (todayDay > closing_day) {
        const nextMonth = dayjs(today).add(1, 'month');
        currentEndYear = nextMonth.year();
        currentEndMonth = nextMonth.month() + 1;
      }
      const currentEndISO = makeISO(currentEndYear, currentEndMonth, closing_day);
      
      const currentEndObj = dayjs(currentEndISO);
      const currentStartObj = currentEndObj.subtract(1, 'month').add(1, 'day');
      const currentStartISO = currentStartObj.format('YYYY-MM-DD');

      // --- Cálculo do Vencimento Atual ---
      let currentDueYear = currentEndObj.year();
      let currentDueMonth = currentEndObj.month() + 1;
      if (due_day < closing_day) {
          const nextMonth = currentEndObj.add(1, 'month');
          currentDueYear = nextMonth.year();
          currentDueMonth = nextMonth.month() + 1;
      }
      const currentDueISO = makeISO(currentDueYear, currentDueMonth, due_day);
      const daysToDue = diffDays(today, currentDueISO);

      // --- Cálculo do Ciclo Fechado ---
      const closedEndObj = currentStartObj.subtract(1, 'day');
      const closedEndISO = closedEndObj.format('YYYY-MM-DD');
      const closedStartObj = closedEndObj.subtract(1, 'month').add(1, 'day');
      const closedStartISO = closedStartObj.format('YYYY-MM-DD');

      // --- Cálculo do Vencimento Fechado ---
      let closedDueYear = closedEndObj.year();
      let closedDueMonth = closedEndObj.month() + 1;
      if (due_day < closing_day) {
          const nextMonth = closedEndObj.add(1, 'month');
          closedDueYear = nextMonth.year();
          closedDueMonth = nextMonth.month() + 1;
      }
      const closedDueISO = makeISO(closedDueYear, closedDueMonth, due_day);

      // --- Soma dos valores ---
      const sumAmount = async (start: string, end: string) => {
        const { data, error } = await supabase
          .from("transactions").select("amount_cents")
          .eq("user_id", userId).eq("type", "expense").eq("card_id", card.id)
          .gte("occurred_at", start).lte("occurred_at", end);
        if (error) throw new Error(`Erro ao somar transações do cartão ${card.id}: ${error.message}`);
        return (data ?? []).reduce((s, r) => s + (Number(r.amount_cents) || 0), 0);
      };

      const [currentAmount, closedAmount] = await Promise.all([
        sumAmount(currentStartISO, currentEndISO),
        sumAmount(closedStartISO, closedEndISO)
      ]);

      console.log('[invoices] card', card.name, { currentStartISO, currentEndISO, currentDueISO, closedStartISO, closedEndISO, closedDueISO });

      results.push({
        cardId: card.id, name: card.name, closingDay: closing_day, dueDay: due_day,
        current: { start: currentStartISO, end: currentEndISO, amountCents: currentAmount, dueDate: currentDueISO, daysToDue },
        closed: { start: closedStartISO, end: closedEndISO, amountCents: closedAmount, dueDate: closedDueISO }
      });

    } catch (err: any) {
      console.warn('[invoices] card cycle error', card.id, err?.message);
      continue;
    }
  }

  return results;
}


/**
 * Cria as transações para representar o pagamento de uma fatura de cartão.
 * Isso é modelado como uma transferência de uma conta para o "limite" do cartão.
 * 1. Saída da conta (transfer, account_id, valor positivo)
 * 2. Entrada no cartão (transfer, card_id, valor positivo)
 */
export async function payCardInvoice(
    supabase: SupabaseClient, 
    userId: string, 
    p: { fromAccountId: string, cardId: string, amountCents: number, occurredAt: string, description?: string }
) {
    if (!userId) throw new Error('Usuário não logado');
    if (!p.fromAccountId) throw new Error('Conta de origem é obrigatória.');
    if (!p.cardId) throw new Error('Cartão de destino é obrigatório.');
    if (!p.amountCents || p.amountCents <= 0) throw new Error('O valor do pagamento deve ser positivo.');

    const transferGroupId = crypto.randomUUID();
    const description = p.description || 'Pagamento de fatura';

    const { data: out, error: outError } = await supabase.from('transactions').insert({
        user_id: userId, type: 'transfer', account_id: p.fromAccountId,
        amount_cents: p.amountCents, occurred_at: p.occurredAt,
        description, transfer_group_id: transferGroupId,
    }).select().single();

    if (outError) throw new Error(`Erro na saída da conta: ${outError.message}`);

    const { data: inn, error: innError } = await supabase.from('transactions').insert({
        user_id: userId, type: 'transfer', card_id: p.cardId,
        amount_cents: p.amountCents, occurred_at: p.occurredAt,
        description, transfer_group_id: transferGroupId,
    }).select().single();
    
    if (innError) {
        // TODO: Rollback da transação de saída
        throw new Error(`Erro na entrada do cartão: ${innError.message}`);
    }

    return { out, inn };
}
