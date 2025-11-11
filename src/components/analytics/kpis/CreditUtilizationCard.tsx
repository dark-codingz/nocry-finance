// ============================================================================
// components/analytics/kpis/CreditUtilizationCard.tsx - Card Utilização de Crédito
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatPercentage } from '@/lib/analytics/formulas';
import { getBadgeType, CREDIT_UTILIZATION_THRESHOLDS } from '@/lib/analytics/thresholds';

type CreditUtilizationCardProps = {
  utilizationPct: number;
  mom?: number;
  isLoading?: boolean;
};

export default function CreditUtilizationCard({
  utilizationPct,
  mom,
  isLoading = false,
}: CreditUtilizationCardProps) {
  const badge = getBadgeType(utilizationPct, CREDIT_UTILIZATION_THRESHOLDS);

  return (
    <KpiCard
      label="Utilização de Crédito"
      value={formatPercentage(utilizationPct)}
      icon="💳"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≤30%"
      isLoading={isLoading}
    />
  );
}

