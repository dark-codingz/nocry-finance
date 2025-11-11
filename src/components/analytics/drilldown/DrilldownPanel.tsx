// ============================================================================
// components/analytics/drilldown/DrilldownPanel.tsx - Painel de Drill-down
// ============================================================================

'use client';

import { useDrilldownData } from '@/hooks/analytics/useDrilldownData';
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import ChartWrapper from '@/components/analytics/shared/ChartWrapper';
import DynamicTable from './DynamicTable';
import { useState } from 'react';
import type { GroupBy, DrilldownData } from '@/services/analytics/drilldown';

export default function DrilldownPanel() {
  const { filters } = useAnalyticsFilters();
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: rawData, isLoading, error } = useDrilldownData({
    filters,
    groupBy,
    page,
    pageSize,
    orderBy: 'expense',
    orderDirection: 'desc',
  });
  
  const data = rawData as DrilldownData | undefined;

  const groupByOptions: { value: GroupBy; label: string }[] = [
    { value: 'month', label: 'Mês' },
    { value: 'category', label: 'Categoria' },
    { value: 'account', label: 'Conta' },
    { value: 'card', label: 'Cartão' },
    { value: 'type', label: 'Tipo (Entrada/Saída)' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ChartWrapper
        title="Explorar (Drill-down)"
        subtitle="Tabela dinâmica com agrupamento e paginação"
        isLoading={isLoading}
        error={error || undefined}
        height="auto"
        actions={
          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as GroupBy);
              setPage(1);
            }}
            className="
              glass rounded-lg px-3 py-1 text-sm text-white border border-white/10
              focus:outline-none focus:border-blue-500 transition-colors
              bg-[#1A1A1A]
            "
          >
            {groupByOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Agrupar por: {opt.label}
              </option>
            ))}
          </select>
        }
      >
        <DynamicTable
          data={data?.rows || []}
          columns={['groupLabel', 'incomeCents', 'expenseCents', 'netCents', 'count']}
          isLoading={isLoading}
          onPageChange={setPage}
          currentPage={page}
          totalPages={data?.pagination ? Math.ceil(data.pagination.totalRows / data.pagination.pageSize) : 1}
        />
      </ChartWrapper>
    </div>
  );
}

