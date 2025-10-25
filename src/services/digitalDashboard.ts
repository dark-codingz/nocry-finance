// src/services/digitalDashboard.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DigitalMonthSummary, OfferRankingRow } from '@/types/digitalDashboard';

// Comentário: As funções neste arquivo foram refatoradas para realizar a agregação de dados
// no lado do cliente (BFF/Node.js) em vez de depender de Funções RPC ou joins implícitos
// no Supabase. Isso foi feito para remover a dependência de um schema de banco de dados
// que ainda não está totalmente migrado e para corrigir erros de "função não encontrada"
// ou "relacionamento não encontrado".

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Utils
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function getMonthRange(monthStr: string) {
  const targetDate = new Date(`${monthStr}-15T12:00:00Z`); // Use um dia no meio para evitar problemas de fuso
  const y = targetDate.getUTCFullYear();
  const m = targetDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { firstDay, lastDay };
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Service Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

/**
 * Busca o resumo mensal para o dashboard digital.
 * Agrega gastos, receitas, ROI, etc., para o mês especificado via código.
 */
export async function getDigitalMonthSummary(supabase: SupabaseClient, userId: string, monthStr: string): Promise<DigitalMonthSummary> {
    if (!userId) return { spendCents: 0, revenueCents: 0, roiPct: null, cacCents: null, ticketCents: null, hours: 0, salesCount: 0 };
    const { firstDay, lastDay } = getMonthRange(monthStr);

    const spendPromise = supabase.from('spend_events').select('amount_cents').eq('user_id', userId).gte('date', firstDay).lte('date', lastDay);
    const salesPromise = supabase.from('sales').select('amount_cents').eq('user_id', userId).eq('status', 'approved').gte('date', firstDay).lte('date', lastDay);
    const workPromise = supabase.from('work_sessions').select('duration_minutes').eq('user_id', userId).gte('started_at', firstDay).lte('started_at', lastDay);

    const [spendRes, salesRes, workRes] = await Promise.all([spendPromise, salesPromise, workPromise]);

    const spendCents = spendRes.data?.reduce((sum, row) => sum + row.amount_cents, 0) ?? 0;
    const revenueCents = salesRes.data?.reduce((sum, row) => sum + row.amount_cents, 0) ?? 0;
    const salesCount = salesRes.data?.length ?? 0;
    const totalMinutes = workRes.data?.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0) ?? 0;

    const roiPct = spendCents > 0 ? ((revenueCents - spendCents) / spendCents) * 100 : null;
    const cacCents = salesCount > 0 ? spendCents / salesCount : null;
    const ticketCents = salesCount > 0 ? revenueCents / salesCount : null;

    return {
        spendCents,
        revenueCents,
        roiPct,
        cacCents,
        ticketCents,
        hours: +(totalMinutes / 60).toFixed(1),
        salesCount,
    };
}

/**
 * Busca o ranking das 5 ofertas mais lucrativas do mês via código.
 */
export async function getOfferRanking(supabase: SupabaseClient, userId: string, monthStr: string): Promise<OfferRankingRow[]> {
    if (!userId) return [];
    const { firstDay, lastDay } = getMonthRange(monthStr);

    const offersPromise = supabase.from('offers').select('id, name').eq('user_id', userId);
    const spendPromise = supabase.from('spend_events').select('offer_id, amount_cents').eq('user_id', userId).gte('date', firstDay).lte('date', lastDay);
    const salesPromise = supabase.from('sales').select('offer_id, amount_cents').eq('user_id', userId).eq('status', 'approved').gte('date', firstDay).lte('date', lastDay);

    const [offersRes, spendRes, salesRes] = await Promise.all([offersPromise, spendPromise, salesPromise]);
    if (offersRes.error || spendRes.error || salesRes.error) {
        console.error("Erro ao buscar dados para o ranking:", offersRes.error || spendRes.error || salesRes.error);
        return [];
    }

    const offersMap = new Map(offersRes.data?.map(o => [o.id, o.name]));
    const rankingMap = new Map<string, { spendCents: number; revenueCents: number }>();

    spendRes.data?.forEach(s => {
        const offerId = s.offer_id;
        if (!offerId) return;
        const current = rankingMap.get(offerId) ?? { spendCents: 0, revenueCents: 0 };
        current.spendCents += s.amount_cents;
        rankingMap.set(offerId, current);
    });

    salesRes.data?.forEach(s => {
        const offerId = s.offer_id;
        if (!offerId) return;
        const current = rankingMap.get(offerId) ?? { spendCents: 0, revenueCents: 0 };
        current.revenueCents += s.amount_cents;
        rankingMap.set(offerId, current);
    });

    const rankedList: Omit<OfferRankingRow, 'offerName' | 'roiPct' | 'salesCount' | 'hours'>[] = Array.from(rankingMap.entries()).map(([offerId, data]) => ({
        offerId,
        ...data,
        profitCents: data.revenueCents - data.spendCents,
    }));
    
    rankedList.sort((a, b) => b.profitCents - a.profitCents);

    return rankedList.slice(0, 5).map(item => ({
        ...item,
        offerName: offersMap.get(item.offerId) ?? 'Oferta desconhecida',
        roiPct: item.spendCents > 0 ? ((item.revenueCents - item.spendCents) / item.spendCents) * 100 : null,
        // Campos salesCount e hours não estão no escopo desta agregação simplificada
        salesCount: 0, 
        hours: 0,
    }));
}
