// ============================================================================
// components/analytics/categories/CategoriesParetoPanel.tsx - Painel de Categorias
// ============================================================================

'use client';

import { useCategoriesData } from '@/hooks/analytics/useCategoriesData';
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import ChartWrapper from '@/components/analytics/shared/ChartWrapper';
import ParetoChart from './ParetoChart';
import BudgetDeviationChart from './BudgetDeviationChart';

export default function CategoriesParetoPanel() {
  const { filters, setCategories } = useAnalyticsFilters();
  const { data, isLoading, error } = useCategoriesData(filters);

  const handleClickCategory = (categoryName: string) => {
    // TODO: Filtrar por categoria clicada
    console.log('Filtrar por categoria:', categoryName);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Gráfico 1: Pareto 80/20 */}
      <ChartWrapper
        title="Pareto 80/20 (Categorias)"
        subtitle="Principais categorias de gastos (clique para filtrar)"
        isLoading={isLoading}
        error={error || undefined}
        height={400}
      >
        <ParetoChart
          data={data?.pareto || []}
          onClickCategory={handleClickCategory}
        />
      </ChartWrapper>

      {/* Gráfico 2: Desvio vs Orçamento */}
      <ChartWrapper
        title="Desvio vs Orçamento"
        subtitle="Verde = economia | Vermelho = estouro"
        isLoading={isLoading}
        error={error || undefined}
        height={350}
      >
        <BudgetDeviationChart data={data?.budgetComparison || []} />
      </ChartWrapper>
    </div>
  );
}

