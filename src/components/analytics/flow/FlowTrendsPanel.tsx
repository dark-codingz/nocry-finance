// ============================================================================
// components/analytics/flow/FlowTrendsPanel.tsx - Painel de Fluxo e Tendências
// ============================================================================

'use client';

import { useFlowData } from '@/hooks/analytics/useFlowData';
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import ChartWrapper from '@/components/analytics/shared/ChartWrapper';
import IncomeExpenseChart from './IncomeExpenseChart';
import CumulativeChart from './CumulativeChart';

export default function FlowTrendsPanel() {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error } = useFlowData(filters);

  return (
    <div className="flex flex-col gap-6">
      {/* Gráfico 1: Entradas/Saídas/Líquido + MA3 */}
      <ChartWrapper
        title="Fluxo de Caixa"
        subtitle="Entradas, Saídas e Líquido (com média móvel de 3 meses)"
        isLoading={isLoading}
        error={error || undefined}
        height={400}
      >
        <IncomeExpenseChart data={data?.series || []} />
      </ChartWrapper>

      {/* Gráfico 2: S-curve (Gasto Acumulado vs Orçamento) - TODO FASE 2 */}
      {/* 
      <ChartWrapper
        title="Projeção de Gastos do Mês"
        subtitle="Gasto acumulado vs linha ideal do orçamento"
        isLoading={isLoading}
        error={error || undefined}
        height={350}
      >
        <CumulativeChart
          data={[]}
          currentDay={1}
        />
      </ChartWrapper>
      */}
    </div>
  );
}

