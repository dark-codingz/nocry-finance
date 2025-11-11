// ============================================================================
// services/analytics/categories.ts - Service para Categorias & Pareto
// ============================================================================
// PROPÓSITO:
// - Buscar dados de categorias (gastos por categoria)
// - Calcular Pareto 80/20
// - Comparar com orçamento (desvio)
//
// ORIGEM DOS DADOS:
// - v_cash_movements_monthly (modo CAIXA)
// - v_budget_vs_actual (desvio vs orçamento)
// - categories (nomes)
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';
import { calculateCumulativePercentage } from '@/lib/analytics/formulas';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type CategoryDataPoint = {
  categoryId: string;
  categoryName: string;
  totalCents: number;
  count: number; // Quantidade de transações
  percentage: number; // % do total
  cumulativePercentage: number; // % acumulado (Pareto)
};

export type CategoryBudgetComparison = {
  categoryId: string;
  categoryName: string;
  actualCents: number;
  budgetCents: number; // 0 se sem orçamento por categoria (futuro)
  varianceCents: number; // actual - budget
  variancePercentage: number; // (variance / budget) * 100
};

export type CategoriesData = {
  pareto: CategoryDataPoint[];
  budgetComparison: CategoryBudgetComparison[];
  totalExpenseCents: number;
};

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca dados de Categorias & Pareto
 * 
 * @param filters - Filtros de analytics
 * @returns Dados de Pareto e comparação com orçamento
 */
export async function getCategoriesData(
  filters: AnalyticsFilters
): Promise<CategoriesData> {
  const supabase = createSupabaseBrowser();

  // ──────────────────────────────────────────────────────────────────────
  // 1. Buscar gastos por categoria (modo CAIXA)
  // ──────────────────────────────────────────────────────────────────────
  const { data: movementsData, error: movementsError } = await supabase
    .from('v_cash_movements_monthly')
    .select('category_id, total_cents, count_tx')
    .eq('user_id', filters.userId)
    .eq('type', 'expense') // Apenas despesas
    .gte('year_month', filters.dateRange.from.slice(0, 7))
    .lte('year_month', filters.dateRange.to.slice(0, 7));

  if (movementsError) throw movementsError;

  // Agrupar por categoria
  const grouped = groupByCategory(movementsData || []);

  // ──────────────────────────────────────────────────────────────────────
  // 2. Buscar nomes das categorias
  // ──────────────────────────────────────────────────────────────────────
  const categoryIds = grouped.map((g) => g.categoryId).filter((id) => id !== null);

  let categoryNames = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (categoriesError) throw categoriesError;

    categoryNames = new Map(categoriesData?.map((c) => [c.id, c.name]) || []);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Calcular totais e percentuais
  // ──────────────────────────────────────────────────────────────────────
  const totalExpense = grouped.reduce((sum, g) => sum + g.totalCents, 0);

  const pareto: CategoryDataPoint[] = grouped
    .map((g) => ({
      categoryId: g.categoryId || '',
      categoryName: categoryNames.get(g.categoryId || '') || 'Sem Categoria',
      totalCents: g.totalCents,
      count: g.count,
      percentage: totalExpense > 0 ? (g.totalCents / totalExpense) * 100 : 0,
      cumulativePercentage: 0, // Calculado abaixo
    }))
    .sort((a, b) => b.totalCents - a.totalCents); // Ordenar decrescente

  // Calcular % acumulado (Pareto)
  const cumulativePercentages = calculateCumulativePercentage(
    pareto.map((p) => p.totalCents)
  );

  pareto.forEach((p, i) => {
    p.cumulativePercentage = cumulativePercentages[i];
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Buscar comparação com orçamento (mês atual)
  // ──────────────────────────────────────────────────────────────────────
  const currentMonth = filters.dateRange.from.slice(0, 7);

  const { data: budgetData, error: budgetError } = await supabase
    .from('v_budget_vs_actual')
    .select('category_id, actual_cents, budget_cents, variance_cents, variance_pct')
    .eq('user_id', filters.userId)
    .eq('year_month', currentMonth);

  if (budgetError && budgetError.code !== 'PGRST116') {
    throw budgetError; // Ignora "no rows"
  }

  const budgetComparison: CategoryBudgetComparison[] = (budgetData || []).map((b) => ({
    categoryId: b.category_id || '',
    categoryName: categoryNames.get(b.category_id || '') || 'Sem Categoria',
    actualCents: b.actual_cents || 0,
    budgetCents: b.budget_cents || 0, // Por enquanto, orçamento é total (não por categoria)
    varianceCents: b.variance_cents || 0,
    variancePercentage: b.variance_pct || 0,
  }));

  // ──────────────────────────────────────────────────────────────────────
  // 5. Retornar dados
  // ──────────────────────────────────────────────────────────────────────
  return {
    pareto,
    budgetComparison,
    totalExpenseCents: totalExpense,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function groupByCategory(
  data: any[]
): Array<{ categoryId: string | null; totalCents: number; count: number }> {
  const grouped = new Map<string | null, { totalCents: number; count: number }>();

  data.forEach((row) => {
    const categoryId = row.category_id;
    const existing = grouped.get(categoryId) || { totalCents: 0, count: 0 };

    existing.totalCents += row.total_cents;
    existing.count += row.count_tx;

    grouped.set(categoryId, existing);
  });

  return Array.from(grouped.entries()).map(([categoryId, values]) => ({
    categoryId,
    totalCents: values.totalCents,
    count: values.count,
  }));
}

