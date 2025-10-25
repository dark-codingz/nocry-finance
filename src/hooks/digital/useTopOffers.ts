// src/hooks/digital/useTopOffers.ts
// ============================================================================
// Hook para buscar Top 5 Ofertas por Desempenho
// ============================================================================
//
// FONTE DE DADOS:
// - offers: catálogo de ofertas do usuário
// - spend_events: gastos por oferta no período
// - sales: vendas aprovadas por oferta no período
//
// LÓGICA DE RANKING:
// - Ordenar por Lucro (Receita - Gasto) DESC
// - Retornar top 5 ofertas
//
// CÁLCULOS POR OFERTA:
// - Gasto: soma de spend_events.amount_cents
// - Receita: soma de sales.amount_cents (status = approved)
// - ROI: Receita / Gasto (ou null se Gasto = 0)
// - Vendas: contagem de sales
//
// FUTURO:
// - Adicionar métricas de conversão (CTR, taxa de conversão)
// - Rastrear origem das vendas (UTM, fonte, campanha)
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Tipos
// ============================================================================

export interface TopOfferItem {
  offerId: string;
  offerName: string;
  spendCents: number;
  revenueCents: number;
  salesCount: number;
  roi: number | null; // null quando spendCents = 0
}

interface UseTopOffersParams {
  userId: string | null;
  from: string;   // ISO date (YYYY-MM-DD)
  to: string;     // ISO date (YYYY-MM-DD)
  limit?: number; // default: 5
}

// ============================================================================
// Service: Buscar Top Ofertas
// ============================================================================

async function fetchTopOffers(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
  limit: number = 5
): Promise<TopOfferItem[]> {
  // Buscar catálogo de ofertas (para pegar os nomes)
  const { data: offersData, error: offersError } = await supabase
    .from('offers')
    .select('id, name')
    .eq('user_id', userId);

  if (offersError) {
    console.error('[useTopOffers] Erro ao buscar ofertas:', offersError);
    return [];
  }

  // Mapa de offerId → offerName
  const offersMap = new Map<string, string>(
    offersData?.map((o) => [o.id, o.name]) || []
  );

  // Buscar gastos por oferta no período
  const { data: spendData, error: spendError } = await supabase
    .from('spend_events')
    .select('offer_id, amount_cents')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);

  if (spendError) {
    console.error('[useTopOffers] Erro ao buscar gastos:', spendError);
  }

  // Buscar vendas por oferta no período
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('offer_id, amount_cents')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('date', from)
    .lte('date', to);

  if (salesError) {
    console.error('[useTopOffers] Erro ao buscar vendas:', salesError);
  }

  // Agregação por offer_id
  // Map: offerId → { spendCents, revenueCents, salesCount }
  const aggregationMap = new Map<
    string,
    { spendCents: number; revenueCents: number; salesCount: number }
  >();

  // Agregar gastos
  spendData?.forEach((row) => {
    const offerId = row.offer_id;
    if (!offerId) return; // Skip se não tiver offer_id

    const current = aggregationMap.get(offerId) || {
      spendCents: 0,
      revenueCents: 0,
      salesCount: 0,
    };
    current.spendCents += row.amount_cents || 0;
    aggregationMap.set(offerId, current);
  });

  // Agregar receitas e contagem de vendas
  salesData?.forEach((row) => {
    const offerId = row.offer_id;
    if (!offerId) return;

    const current = aggregationMap.get(offerId) || {
      spendCents: 0,
      revenueCents: 0,
      salesCount: 0,
    };
    current.revenueCents += row.amount_cents || 0;
    current.salesCount += 1;
    aggregationMap.set(offerId, current);
  });

  // Converter Map para Array e calcular métricas
  const offersList: TopOfferItem[] = Array.from(aggregationMap.entries()).map(
    ([offerId, data]) => {
      const profit = data.revenueCents - data.spendCents;
      const roi = data.spendCents > 0 ? data.revenueCents / data.spendCents : null;

      return {
        offerId,
        offerName: offersMap.get(offerId) || 'Oferta desconhecida',
        spendCents: data.spendCents,
        revenueCents: data.revenueCents,
        salesCount: data.salesCount,
        roi,
        // Usamos profit para ordenar internamente
        _profit: profit,
      };
    }
  );

  // Ordenar por Lucro (Receita - Gasto) DESC
  offersList.sort((a, b) => (b as any)._profit - (a as any)._profit);

  // Retornar top N ofertas
  return offersList.slice(0, limit).map((item) => {
    // Remove o campo auxiliar _profit antes de retornar
    const { _profit, ...cleanItem } = item as any;
    return cleanItem;
  });
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useTopOffers(params: UseTopOffersParams) {
  const supabase = useSupabaseClient();
  const { userId, from, to, limit = 5 } = params;

  return useQuery({
    queryKey: ['top-offers', userId, from, to, limit],
    queryFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      return await fetchTopOffers(supabase, userId, from, to, limit);
    },
    enabled: !!userId && !!from && !!to,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}



