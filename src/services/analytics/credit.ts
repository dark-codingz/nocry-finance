// ============================================================================
// services/analytics/credit.ts - Service para Crédito & Faturas
// ============================================================================
// PROPÓSITO:
// - Buscar dados de utilização de crédito
// - Saldo aberto por cartão
// - Histórico de compras e pagamentos
//
// ORIGEM DOS DADOS:
// - v_statement_open (saldo aberto, utilização)
// - cards (limites)
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type CreditCardData = {
  cardId: string;
  cardName: string;
  limitCents: number;
  usedCents: number; // Saldo aberto
  availableCents: number;
  utilizationPct: number;
  badge: 'success' | 'warning' | 'danger' | 'neutral';
};

export type CreditData = {
  cards: CreditCardData[];
  aggregate: {
    totalLimitCents: number;
    totalUsedCents: number;
    totalAvailableCents: number;
    avgUtilizationPct: number;
    badge: 'success' | 'warning' | 'danger' | 'neutral';
  };
};

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca dados de Crédito & Faturas
 * 
 * @param filters - Filtros de analytics
 * @returns Dados de utilização de crédito por cartão e agregado
 */
export async function getCreditData(
  filters: AnalyticsFilters
): Promise<CreditData> {
  const supabase = createSupabaseBrowser();

  // ──────────────────────────────────────────────────────────────────────
  // 1. Buscar saldo aberto de todos os cartões
  // ──────────────────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('v_statement_open')
    .select('*')
    .eq('user_id', filters.userId)
    .order('card_name', { ascending: true });

  if (error) throw error;

  // ──────────────────────────────────────────────────────────────────────
  // 2. Mapear dados por cartão
  // ──────────────────────────────────────────────────────────────────────
  const cards: CreditCardData[] = (data || []).map((card) => {
    const utilizationPct = card.utilization_pct || 0;

    return {
      cardId: card.card_id,
      cardName: card.card_name,
      limitCents: card.limit_cents,
      usedCents: card.open_amount_cents,
      availableCents: card.available_limit_cents,
      utilizationPct,
      badge: getBadgeCredit(utilizationPct),
    };
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Calcular agregado
  // ──────────────────────────────────────────────────────────────────────
  const totalLimit = cards.reduce((sum, c) => sum + c.limitCents, 0);
  const totalUsed = cards.reduce((sum, c) => sum + c.usedCents, 0);
  const totalAvailable = totalLimit - totalUsed;
  const avgUtilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  return {
    cards,
    aggregate: {
      totalLimitCents: totalLimit,
      totalUsedCents: totalUsed,
      totalAvailableCents: totalAvailable,
      avgUtilizationPct: avgUtilization,
      badge: getBadgeCredit(avgUtilization),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function getBadgeCredit(utilization: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (utilization <= 30) return 'success';
  if (utilization <= 60) return 'warning';
  return 'danger';
}

