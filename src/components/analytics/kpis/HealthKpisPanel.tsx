// ============================================================================
// components/analytics/kpis/HealthKpisPanel.tsx - Painel de KPIs de Saúde
// ============================================================================

'use client';

import { useKpisData } from '@/hooks/analytics/useKpisData';
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import SavingsRatioCard from './SavingsRatioCard';
import DtiCard from './DtiCard';
import EmergencyCard from './EmergencyCard';
import RunwayCard from './RunwayCard';
import BudgetConsumedCard from './BudgetConsumedCard';
import CreditUtilizationCard from './CreditUtilizationCard';

export default function HealthKpisPanel() {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error } = useKpisData(filters);

  if (error) {
    return (
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <span className="text-4xl mb-4">⚠️</span>
          <span className="text-sm text-red-400">Erro ao carregar KPIs</span>
          <span className="text-xs text-[#9F9D9D] mt-2">{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">KPIs de Saúde Financeira</h2>
          <p className="text-sm text-[#9F9D9D] mt-1">
            Indicadores principais de performance financeira
          </p>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SavingsRatioCard
          savingsRatioPct={data?.savingsRatio?.value || 0}
          mom={data?.savingsRatio?.mom}
          isLoading={isLoading}
        />

        <DtiCard
          dtiPct={data?.dti?.value || 0}
          mom={data?.dti?.mom}
          isLoading={isLoading}
        />

        <EmergencyCard
          emergencyMonths={data?.emergency?.months || 0}
          mom={0} // TODO: Calcular MoM
          isLoading={isLoading}
        />

        <RunwayCard
          runwayMonths={data?.runway?.months || 0}
          mom={0} // TODO: Calcular MoM
          isLoading={isLoading}
        />

        <BudgetConsumedCard
          consumedPct={data?.budgetConsumed?.consumed || 0}
          mom={0} // TODO: Calcular MoM
          isLoading={isLoading}
        />

        <CreditUtilizationCard
          utilizationPct={data?.creditUtilization?.utilization || 0}
          mom={0} // TODO: Calcular MoM
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

