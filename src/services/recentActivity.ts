// src/services/recentActivity.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecentActivityItem } from '@/types/recentActivity';

/**
 * Busca e unifica as atividades mais recentes de diferentes módulos (Finanças, Digital).
 *
 * @param supabase - Instância do Supabase client.
 * @param userId - ID do usuário autenticado para aplicar RLS.
 * @param limit - Número máximo de itens a serem retornados.
 * @returns Uma promessa que resolve para um array de atividades recentes, ordenado pela data de ocorrência.
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<RecentActivityItem[]> {
  if (!userId) {
    console.warn('getRecentActivity chamado sem userId.');
    return [];
  }

  // Busca as últimas 10 transações financeiras
  const transactionsPromise = supabase
    .from('transactions')
    .select('id, type, description, amount_cents, created_at, category_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Busca as últimas 10 vendas aprovadas
  const salesPromise = supabase
    .from('sales')
    .select('id, amount_cents, date, offer_id(name)')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('date', { ascending: false })
    .limit(limit);

  // Nota: evitamos joins com `channels` em `spend_events` porque não há FK no schema de dev.
  // Quando o relacionamento existir, podemos reintroduzir a leitura do nome do canal.
  const spendPromise = supabase
    .from('spend_events')
    .select('id, amount_cents, date, offer_id') // Removido: channel_id(name). Adicionado: offer_id
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  // Busca as últimas 10 sessões de trabalho
  const workPromise = supabase
    .from('work_sessions')
    .select('id, started_at, duration_minutes, offer_id(name)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  const [
    { data: transactions, error: txError },
    { data: sales, error: salesError },
    { data: spends, error: spendError },
    { data: works, error: workError },
  ] = await Promise.all([transactionsPromise, salesPromise, spendPromise, workPromise]);

  if (txError) console.error('Erro ao buscar transações:', txError.message);
  if (salesError) console.error('Erro ao buscar vendas:', salesError.message);
  if (spendError) console.error('Erro ao buscar gastos:', spendError.message);
  if (workError) console.error('Erro ao buscar sessões de trabalho:', workError.message);
  
  // Normaliza os dados para o formato unificado
  const normalizedTransactions: RecentActivityItem[] = (transactions || []).map(t => ({
    id: t.id,
    kind: t.type as 'expense' | 'income' | 'transfer', // Confia no tipo do DB
    title: t.description || (t.category_id as any)?.name || `Transação #${t.id.substring(0, 4)}`,
    amountCents: t.amount_cents,
    occurredAtISO: new Date(t.created_at).toISOString(),
    meta: { category: (t.category_id as any)?.name }
  }));

  const normalizedSales: RecentActivityItem[] = (sales || []).map(s => ({
    id: s.id,
    kind: 'sale',
    title: `Venda - ${(s.offer_id as any)?.name || 'Oferta desconhecida'}`,
    amountCents: s.amount_cents,
    occurredAtISO: new Date(s.date).toISOString(),
  }));
  
  const normalizedSpends: RecentActivityItem[] = (spends || []).map(sp => ({
    id: sp.id,
    kind: 'spend',
    // Título ajustado para não depender do nome do canal.
    title: `Gasto em Marketing`,
    amountCents: sp.amount_cents,
    occurredAtISO: new Date(sp.date).toISOString(),
    meta: { offer_id: sp.offer_id } // Adiciona offer_id aos metadados, se útil
  }));

  const normalizedWorks: RecentActivityItem[] = (works || []).map(w => ({
    id: w.id,
    kind: 'work',
    title: `Trabalho - ${(w.offer_id as any)?.name || 'Oferta desconhecida'}`,
    occurredAtISO: new Date(w.started_at).toISOString(),
    meta: { duration_minutes: w.duration_minutes },
  }));

  // Combina, ordena e limita o resultado final
  const allActivities = [
    ...normalizedTransactions,
    ...normalizedSales,
    ...normalizedSpends,
    ...normalizedWorks
  ];

  allActivities.sort((a, b) => new Date(b.occurredAtISO).getTime() - new Date(a.occurredAtISO).getTime());

  return allActivities.slice(0, limit);
}


// ============================================================================
// Atividades Recentes Focadas em Finanças (para a pág. /transacoes)
// ============================================================================

export type FinanceActivity =
  | { id: string; kind: 'expense'|'income';  amountCents: number; occurredAtISO: string; description?: string|null; accountName?: string|null; cardName?: string|null; categoryName?: string|null }
  | { id: string; kind: 'transfer';          amountCents: number; occurredAtISO: string; description?: string|null; accountName?: string|null; cardName?: string|null; categoryName?: string|null };

export interface FinanceActivityFilters {
  firstDay: string;         // 'YYYY-MM-DD'
  lastDay: string;          // 'YYYY-MM-DD'
  accountId?: string;       // XOR com cardId; se nenhum, pega ambos
  cardId?: string;
  categoryId?: string;
  q?: string;               // busca na descrição (client-side if needed)
  limit?: number;           // default 10
}

/**
 * Busca as N atividades financeiras mais recentes dentro de um período,
 * respeitando os mesmos filtros usados no extrato da pág. /transacoes.
 */
export async function getRecentFinanceActivity(supabase: SupabaseClient, userId: string, f: FinanceActivityFilters): Promise<FinanceActivity[]> {
  const { firstDay, lastDay, accountId, cardId, categoryId, q, limit = 10 } = f;

  // base query
  let query = supabase
    .from('transactions')
    .select('id,type,amount_cents,occurred_at,description,account_id,card_id,category_id,created_at')
    .eq('user_id', userId)
    .gte('occurred_at', firstDay)
    .lte('occurred_at', lastDay)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (accountId) query = query.eq('account_id', accountId);
  if (cardId)    query = query.eq('card_id', cardId);
  if (categoryId)query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // filtro q (case-insensitive) no client, se existir
  const rows = (data ?? []).filter(r =>
    !q ? true : (r.description ?? '').toLowerCase().includes(q.toLowerCase())
  );

  // normaliza
  return rows.map((r:any) => ({
    id: r.id,
    kind: (r.type as 'expense'|'income'|'transfer'),
    amountCents: Number(r.amount_cents) || 0,
    occurredAtISO: r.occurred_at,
    description: r.description ?? null,
    // nomes podem ser preenchidos depois (se já tiver caches); por ora, omitir
  }));
}
