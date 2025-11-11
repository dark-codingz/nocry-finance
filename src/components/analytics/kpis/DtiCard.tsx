// ============================================================================
// components/analytics/kpis/DtiCard.tsx - Card DTI (Debt-to-Income)
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatPercentage } from '@/lib/analytics/formulas';
import { getBadgeType, DTI_THRESHOLDS } from '@/lib/analytics/thresholds';

type DtiCardProps = {
  dtiPct: number;
  mom?: number;
  isLoading?: boolean;
};

export default function DtiCard({
  dtiPct,
  mom,
  isLoading = false,
}: DtiCardProps) {
  const badge = getBadgeType(dtiPct, DTI_THRESHOLDS);

  return (
    <KpiCard
      label="DTI (Dívida/Renda)"
      value={formatPercentage(dtiPct)}
      icon="📊"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≤20%"
      isLoading={isLoading}
    />
  );
}

