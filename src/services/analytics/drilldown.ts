// ============================================================================
// services/analytics/drilldown.ts - Service para Drill-down (Tabela Dinâmica)
// ============================================================================
// PROPÓSITO:
// - Buscar transações com agrupamento dinâmico
// - Suportar múltiplos níveis de drill-down
// - Paginação e ordenação
//
// ORIGEM DOS DADOS:
// - transactions (direto, sem view para flexibilidade)
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type GroupBy = 'month' | 'category' | 'account' | 'card' | 'type';

export type DrilldownRow = {
  groupKey: string; // Ex: "2025-01" ou "category-123"
  groupLabel: string; // Ex: "Janeiro 2025" ou "Alimentação"
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  count: number; // Quantidade de transações
};

export type DrilldownData = {
  rows: DrilldownRow[];
  total: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    count: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
  };
};

export type DrilldownParams = {
  filters: AnalyticsFilters;
  groupBy: GroupBy;
  page?: number;
  pageSize?: number;
  orderBy?: 'income' | 'expense' | 'net' | 'count';
  orderDirection?: 'asc' | 'desc';
};

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca dados para tabela dinâmica (drill-down)
 * 
 * @param params - Parâmetros de drill-down
 * @returns Dados agrupados com paginação
 */
export async function getDrilldownData(
  params: DrilldownParams
): Promise<DrilldownData> {
  const supabase = createSupabaseBrowser();
  const { filters, groupBy, page = 1, pageSize = 50, orderBy = 'expense', orderDirection = 'desc' } = params;

  // ──────────────────────────────────────────────────────────────────────
  // 1. Construir query base
  // ──────────────────────────────────────────────────────────────────────
  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', filters.userId)
    .gte('occurred_at', filters.dateRange.from)
    .lte('occurred_at', filters.dateRange.to)
    .in('type', ['income', 'expense']); // Ignora transfers

  // Filtrar por modo (CAIXA vs COMPETÊNCIA)
  if (filters.mode === 'cash') {
    query = query.is('card_id', null); // Apenas CAIXA
  } else {
    query = query.not('card_id', 'is', null); // Apenas COMPETÊNCIA
  }

  // Filtros adicionais
  if (filters.accounts.length > 0) {
    query = query.in('account_id', filters.accounts);
  }

  if (filters.cards.length > 0) {
    query = query.in('card_id', filters.cards);
  }

  if (filters.categories.length > 0) {
    query = query.in('category_id', filters.categories);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Executar query
  // ──────────────────────────────────────────────────────────────────────
  const { data, error, count } = await query;

  if (error) throw error;

  // ──────────────────────────────────────────────────────────────────────
  // 3. Agrupar dados no frontend (Supabase não suporta GROUP BY via client)
  // ──────────────────────────────────────────────────────────────────────
  const grouped = groupData(data || [], groupBy);

  // ──────────────────────────────────────────────────────────────────────
  // 4. Ordenar
  // ──────────────────────────────────────────────────────────────────────
  const sorted = sortData(grouped, orderBy, orderDirection);

  // ──────────────────────────────────────────────────────────────────────
  // 5. Paginar
  // ──────────────────────────────────────────────────────────────────────
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginated = sorted.slice(startIndex, endIndex);

  // ──────────────────────────────────────────────────────────────────────
  // 6. Calcular totais
  // ──────────────────────────────────────────────────────────────────────
  const total = {
    incomeCents: sorted.reduce((sum, row) => sum + row.incomeCents, 0),
    expenseCents: sorted.reduce((sum, row) => sum + row.expenseCents, 0),
    netCents: sorted.reduce((sum, row) => sum + row.netCents, 0),
    count: sorted.reduce((sum, row) => sum + row.count, 0),
  };

  return {
    rows: paginated,
    total,
    pagination: {
      page,
      pageSize,
      totalRows: sorted.length,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function groupData(data: any[], groupBy: GroupBy): DrilldownRow[] {
  const grouped = new Map<string, { income: number; expense: number; count: number; label: string }>();

  data.forEach((tx) => {
    let groupKey: string;
    let groupLabel: string;

    switch (groupBy) {
      case 'month':
        groupKey = tx.occurred_at.slice(0, 7); // YYYY-MM
        groupLabel = formatMonth(groupKey);
        break;
      case 'category':
        groupKey = tx.category_id || 'sem-categoria';
        groupLabel = 'Sem Categoria'; // TODO: Buscar nome da categoria
        break;
      case 'account':
        groupKey = tx.account_id || 'sem-conta';
        groupLabel = 'Sem Conta'; // TODO: Buscar nome da conta
        break;
      case 'card':
        groupKey = tx.card_id || 'sem-cartao';
        groupLabel = 'Sem Cartão'; // TODO: Buscar nome do cartão
        break;
      case 'type':
        groupKey = tx.type;
        groupLabel = tx.type === 'income' ? 'Receita' : 'Despesa';
        break;
      default:
        groupKey = 'outros';
        groupLabel = 'Outros';
    }

    const existing = grouped.get(groupKey) || { income: 0, expense: 0, count: 0, label: groupLabel };

    if (tx.type === 'income') {
      existing.income += tx.amount_cents;
    } else if (tx.type === 'expense') {
      existing.expense += tx.amount_cents;
    }

    existing.count += 1;

    grouped.set(groupKey, existing);
  });

  return Array.from(grouped.entries()).map(([groupKey, values]) => ({
    groupKey,
    groupLabel: values.label,
    incomeCents: values.income,
    expenseCents: values.expense,
    netCents: values.income - values.expense,
    count: values.count,
  }));
}

function sortData(
  data: DrilldownRow[],
  orderBy: 'income' | 'expense' | 'net' | 'count',
  orderDirection: 'asc' | 'desc'
): DrilldownRow[] {
  const sorted = [...data];

  sorted.sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (orderBy) {
      case 'income':
        aValue = a.incomeCents;
        bValue = b.incomeCents;
        break;
      case 'expense':
        aValue = a.expenseCents;
        bValue = b.expenseCents;
        break;
      case 'net':
        aValue = a.netCents;
        bValue = b.netCents;
        break;
      case 'count':
        aValue = a.count;
        bValue = b.count;
        break;
    }

    return orderDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return sorted;
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

