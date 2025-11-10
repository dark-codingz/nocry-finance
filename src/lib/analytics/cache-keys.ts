// ============================================================================
// lib/analytics/cache-keys.ts - Gerador de Cache Keys para React Query
// ============================================================================
// PROPÓSITO:
// - Gerar chaves de cache consistentes para React Query
// - Derivar chaves dos filtros do usuário
// - Facilitar invalidação de cache
//
// ESTRUTURA:
// ['analytics', section, userId, mode, from, to, accounts, cards, categories]
//
// SECTIONS:
// - 'kpis': KPIs de saúde
// - 'flow': Flow & Tendências
// - 'categories': Categorias & Pareto
// - 'credit': Crédito & Faturas
// - 'drilldown': Tabela dinâmica
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Modo de exibição (Caixa x Competência)
 */
export type AnalyticsMode = 'cash' | 'accrual';

/**
 * Período pré-definido
 */
export type AnalyticsPeriod = 'month' | '3m' | 'ytd' | 'custom';

/**
 * Filtros globais de analytics
 */
export type AnalyticsFilters = {
  userId: string;
  mode: AnalyticsMode;
  dateRange: {
    from: string; // ISO date (YYYY-MM-DD)
    to: string; // ISO date (YYYY-MM-DD)
    period: AnalyticsPeriod;
  };
  accounts: string[]; // IDs de contas
  cards: string[]; // IDs de cartões
  categories: string[]; // IDs de categorias
  tags?: string[]; // IDs de tags (futuro)
};

/**
 * Seções de analytics
 */
export type AnalyticsSection =
  | 'kpis'
  | 'flow'
  | 'categories'
  | 'credit'
  | 'drilldown'
  | 'recurrences'
  | 'alerts';

// ────────────────────────────────────────────────────────────────────────────
// GERADOR DE CACHE KEYS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Gera cache key para React Query
 * 
 * @param section - Seção de analytics
 * @param filters - Filtros aplicados
 * @returns Array de strings para usar como queryKey
 * 
 * @example
 * getCacheKey('kpis', {
 *   userId: 'user-123',
 *   mode: 'cash',
 *   dateRange: { from: '2025-01-01', to: '2025-01-31', period: 'month' },
 *   accounts: ['acc-1', 'acc-2'],
 *   cards: [],
 *   categories: ['cat-1']
 * })
 * // => ['analytics', 'kpis', 'user-123', 'cash', '2025-01-01', '2025-01-31', 'acc-1,acc-2', '', 'cat-1']
 */
export function getCacheKey(
  section: AnalyticsSection,
  filters: AnalyticsFilters
): string[] {
  return [
    'analytics',
    section,
    filters.userId,
    filters.mode,
    filters.dateRange.from,
    filters.dateRange.to,
    filters.accounts.sort().join(','), // Sort para consistência
    filters.cards.sort().join(','),
    filters.categories.sort().join(','),
  ];
}

/**
 * Gera cache key para invalidação por seção
 * 
 * @param section - Seção de analytics
 * @param userId - ID do usuário
 * @returns Array de strings para usar em invalidateQueries
 * 
 * @example
 * getSectionKey('kpis', 'user-123')
 * // => ['analytics', 'kpis', 'user-123']
 */
export function getSectionKey(
  section: AnalyticsSection,
  userId: string
): string[] {
  return ['analytics', section, userId];
}

/**
 * Gera cache key para invalidação geral de analytics
 * 
 * @param userId - ID do usuário
 * @returns Array de strings para usar em invalidateQueries
 * 
 * @example
 * getAnalyticsKey('user-123')
 * // => ['analytics', 'user-123']
 */
export function getAnalyticsKey(userId: string): string[] {
  return ['analytics', userId];
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Serializa filtros para URL (searchParams)
 * 
 * @param filters - Filtros de analytics
 * @returns URLSearchParams
 * 
 * @example
 * const params = serializeFilters(filters);
 * router.push(`/analytics?${params.toString()}`);
 */
export function serializeFilters(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  params.set('mode', filters.mode);
  params.set('from', filters.dateRange.from);
  params.set('to', filters.dateRange.to);
  params.set('period', filters.dateRange.period);
  
  if (filters.accounts.length > 0) {
    params.set('accounts', filters.accounts.join(','));
  }
  
  if (filters.cards.length > 0) {
    params.set('cards', filters.cards.join(','));
  }
  
  if (filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }
  
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  
  return params;
}

/**
 * Deserializa URL searchParams para filtros
 * 
 * @param searchParams - URLSearchParams
 * @param userId - ID do usuário autenticado
 * @param defaults - Valores padrão
 * @returns Filtros de analytics
 * 
 * @example
 * const filters = deserializeFilters(searchParams, 'user-123', {
 *   mode: 'cash',
 *   dateRange: { from: '2025-01-01', to: '2025-01-31', period: 'month' }
 * });
 */
export function deserializeFilters(
  searchParams: URLSearchParams,
  userId: string,
  defaults: {
    mode: AnalyticsMode;
    dateRange: { from: string; to: string; period: AnalyticsPeriod };
  }
): AnalyticsFilters {
  const mode = (searchParams.get('mode') as AnalyticsMode) || defaults.mode;
  const from = searchParams.get('from') || defaults.dateRange.from;
  const to = searchParams.get('to') || defaults.dateRange.to;
  const period = (searchParams.get('period') as AnalyticsPeriod) || defaults.dateRange.period;
  
  const accounts = searchParams.get('accounts')?.split(',').filter(Boolean) || [];
  const cards = searchParams.get('cards')?.split(',').filter(Boolean) || [];
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  
  return {
    userId,
    mode,
    dateRange: { from, to, period },
    accounts,
    cards,
    categories,
    tags,
  };
}

/**
 * Cria filtros padrão para o mês atual
 * 
 * @param userId - ID do usuário
 * @returns Filtros padrão
 */
export function getDefaultFilters(userId: string): AnalyticsFilters {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const from = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  
  return {
    userId,
    mode: 'cash',
    dateRange: {
      from,
      to,
      period: 'month',
    },
    accounts: [],
    cards: [],
    categories: [],
  };
}

/**
 * Calcula período "Últimos 3 meses"
 * 
 * @returns { from, to }
 */
export function getLast3MonthsRange(): { from: string; to: string } {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  
  const from = threeMonthsAgo.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  
  return { from, to };
}

/**
 * Calcula período "YTD" (Year-to-Date)
 * 
 * @returns { from, to }
 */
export function getYTDRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  
  const from = `${year}-01-01`;
  const to = now.toISOString().slice(0, 10);
  
  return { from, to };
}

