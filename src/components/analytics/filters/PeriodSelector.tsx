// ============================================================================
// components/analytics/filters/PeriodSelector.tsx - Seletor de Período
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import type { AnalyticsPeriod } from '@/lib/analytics/cache-keys';

export default function PeriodSelector() {
  const { filters, setPeriod } = useAnalyticsFilters();

  const periods: { value: AnalyticsPeriod; label: string }[] = [
    { value: 'month', label: 'Mês Atual' },
    { value: '3m', label: 'Últimos 3 meses' },
    { value: 'ytd', label: 'Ano até agora (YTD)' },
    { value: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[#9F9D9D]">Período</label>
      
      <select
        value={filters.dateRange.period}
        onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
        className="
          glass rounded-lg px-4 py-2 text-sm text-white border border-white/10
          focus:outline-none focus:border-blue-500 transition-colors
          bg-[#1A1A1A]
        "
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>

      {/* Custom Date Range */}
      {filters.dateRange.period === 'custom' && (
        <div className="flex gap-2 mt-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-[#9F9D9D]">De</label>
            <input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => {
                const { setDateRange } = useAnalyticsFilters();
                setDateRange(e.target.value, filters.dateRange.to);
              }}
              className="
                glass rounded-lg px-3 py-2 text-sm text-white border border-white/10
                focus:outline-none focus:border-blue-500 transition-colors
                bg-[#1A1A1A]
              "
            />
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-[#9F9D9D]">Até</label>
            <input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => {
                const { setDateRange } = useAnalyticsFilters();
                setDateRange(filters.dateRange.from, e.target.value);
              }}
              className="
                glass rounded-lg px-3 py-2 text-sm text-white border border-white/10
                focus:outline-none focus:border-blue-500 transition-colors
                bg-[#1A1A1A]
              "
            />
          </div>
        </div>
      )}
    </div>
  );
}

