// ============================================================================
// components/analytics/kpis/RunwayCard.tsx - Card Runway (Pista de Liquidez)
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatMonths } from '@/lib/analytics/formulas';
import { getBadgeType, RUNWAY_THRESHOLDS } from '@/lib/analytics/thresholds';

type RunwayCardProps = {
  runwayMonths: number;
  mom?: number;
  isLoading?: boolean;
};

export default function RunwayCard({
  runwayMonths,
  mom,
  isLoading = false,
}: RunwayCardProps) {
  const badge = getBadgeType(runwayMonths, RUNWAY_THRESHOLDS);

  return (
    <KpiCard
      label="Runway (Liquidez)"
      value={formatMonths(runwayMonths)}
      icon="🚀"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≥12 meses"
      isLoading={isLoading}
    />
  );
}

