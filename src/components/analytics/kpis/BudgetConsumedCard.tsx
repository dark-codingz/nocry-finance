// ============================================================================
// components/analytics/kpis/BudgetConsumedCard.tsx - Card Orçamento Consumido
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatPercentage } from '@/lib/analytics/formulas';
import { getBadgeType, BUDGET_CONSUMED_THRESHOLDS } from '@/lib/analytics/thresholds';

type BudgetConsumedCardProps = {
  consumedPct: number;
  mom?: number;
  isLoading?: boolean;
};

export default function BudgetConsumedCard({
  consumedPct,
  mom,
  isLoading = false,
}: BudgetConsumedCardProps) {
  const badge = getBadgeType(consumedPct, BUDGET_CONSUMED_THRESHOLDS);

  return (
    <KpiCard
      label="Orçamento Consumido"
      value={formatPercentage(consumedPct)}
      icon="📋"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≤80%"
      isLoading={isLoading}
    />
  );
}

