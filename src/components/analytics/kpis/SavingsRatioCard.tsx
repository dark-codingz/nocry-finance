// ============================================================================
// components/analytics/kpis/SavingsRatioCard.tsx - Card Taxa de Poupança
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatPercentage } from '@/lib/analytics/formulas';
import { getBadgeType, SAVINGS_RATIO_THRESHOLDS } from '@/lib/analytics/thresholds';

type SavingsRatioCardProps = {
  savingsRatioPct: number;
  mom?: number;
  isLoading?: boolean;
};

export default function SavingsRatioCard({
  savingsRatioPct,
  mom,
  isLoading = false,
}: SavingsRatioCardProps) {
  const badge = getBadgeType(savingsRatioPct, SAVINGS_RATIO_THRESHOLDS);

  return (
    <KpiCard
      label="Taxa de Poupança"
      value={formatPercentage(savingsRatioPct)}
      icon="💰"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≥20%"
      isLoading={isLoading}
    />
  );
}

