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
          savingsRatioPct={data?.savingsRatioPct || 0}
          mom={data?.savingsRatioMoM}
          isLoading={isLoading}
        />

        <DtiCard
          dtiPct={data?.dtiPct || 0}
          mom={data?.dtiMoM}
          isLoading={isLoading}
        />

        <EmergencyCard
          emergencyMonths={data?.emergencyMonths || 0}
          mom={data?.emergencyMoM}
          isLoading={isLoading}
        />

        <RunwayCard
          runwayMonths={data?.runwayMonths || 0}
          mom={data?.runwayMoM}
          isLoading={isLoading}
        />

        <BudgetConsumedCard
          consumedPct={data?.budgetConsumedPct || 0}
          mom={data?.budgetConsumedMoM}
          isLoading={isLoading}
        />

        <CreditUtilizationCard
          utilizationPct={data?.creditUtilizationPct || 0}
          mom={data?.creditUtilizationMoM}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

