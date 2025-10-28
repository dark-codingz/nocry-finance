// src/hooks/digital/useDigitalKpis.ts
// ============================================================================
// Hook para buscar KPIs do Desempenho Digital
// ============================================================================
// 
// FONTE DE DADOS:
// - spend_events: gastos por oferta no período
// - sales: vendas aprovadas no período
// 
// CÁLCULOS:
// - ROI = Receita / Gasto (ou null se Gasto = 0)
// - CAC = Gasto / nº de vendas (ou null se vendas = 0)
// - Ticket Médio = Receita / nº de vendas (ou null se vendas = 0)
//
// FUTURO:
// - Conectar com dados reais do Kiwify/UTMify via webhooks
// - Adicionar métricas de LTV (Lifetime Value)
// - Tracking de conversões por fonte/UTM
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Tipos
// ============================================================================

export interface DigitalKpisData {
  spendCents: number;
  revenueCents: number;
  salesCount: number;
  roi: number | null;        // null quando Gasto = 0
  cacCents: number | null;   // null quando vendas = 0
  ticketCents: number | null; // null quando vendas = 0
}

interface UseDigitalKpisParams {
  userId: string | null;
  from: string; // ISO date (YYYY-MM-DD)
  to: string;   // ISO date (YYYY-MM-DD)
}

// ============================================================================
// Service: Buscar dados agregados do período
// ============================================================================

async function fetchDigitalKpis(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string
): Promise<DigitalKpisData> {
  // Buscar gastos do período (spend_events)
  // NOTE: spend_events.date contém a data do gasto
  const { data: spendData, error: spendError } = await supabase
    .from('spend_events')
    .select('amount_cents')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);

  if (spendError) {
    console.error('[useDigitalKpis] Erro ao buscar gastos:', spendError);
  }

  // Buscar vendas aprovadas do período (sales)
  // NOTE: sales.date ou created_at? Verificar schema. Assumindo 'date' por consistência.
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('amount_cents')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('date', from)
    .lte('date', to);

  if (salesError) {
    console.error('[useDigitalKpis] Erro ao buscar vendas:', salesError);
  }

  // Agregação no client-side
  const spendCents = spendData?.reduce((sum, row) => sum + (row.amount_cents || 0), 0) ?? 0;
  const revenueCents = salesData?.reduce((sum, row) => sum + (row.amount_cents || 0), 0) ?? 0;
  const salesCount = salesData?.length ?? 0;

  // Cálculo de métricas derivadas
  // ROI = Receita / Gasto
  // Se Gasto = 0, não podemos calcular ROI → null
  const roi = spendCents > 0 ? revenueCents / spendCents : null;

  // CAC (Custo de Aquisição por Cliente) = Gasto / nº de vendas
  // Se não houver vendas, CAC é indefinido → null
  const cacCents = salesCount > 0 ? Math.round(spendCents / salesCount) : null;

  // Ticket Médio = Receita / nº de vendas
  // Se não houver vendas, ticket é indefinido → null
  const ticketCents = salesCount > 0 ? Math.round(revenueCents / salesCount) : null;

  return {
    spendCents,
    revenueCents,
    salesCount,
    roi,
    cacCents,
    ticketCents,
  };
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useDigitalKpis(params: UseDigitalKpisParams) {
  const supabase = useSupabaseClient();
  const { userId, from, to } = params;

  return useQuery({
    queryKey: ['digital-kpis', userId, from, to],
    queryFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      return await fetchDigitalKpis(supabase, userId, from, to);
    },
    enabled: !!userId && !!from && !!to,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}




