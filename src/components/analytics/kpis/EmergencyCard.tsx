// ============================================================================
// components/analytics/kpis/EmergencyCard.tsx - Card Reserva de Emergência
// ============================================================================

'use client';

import KpiCard from '@/components/analytics/shared/KpiCard';
import { formatMonths } from '@/lib/analytics/formulas';
import { getBadgeType, EMERGENCY_THRESHOLDS } from '@/lib/analytics/thresholds';

type EmergencyCardProps = {
  emergencyMonths: number;
  mom?: number;
  isLoading?: boolean;
};

export default function EmergencyCard({
  emergencyMonths,
  mom,
  isLoading = false,
}: EmergencyCardProps) {
  const badge = getBadgeType(emergencyMonths, EMERGENCY_THRESHOLDS);

  return (
    <KpiCard
      label="Reserva de Emergência"
      value={formatMonths(emergencyMonths)}
      icon="🛡️"
      badge={badge}
      mom={mom}
      subtitle="Meta: ≥6 meses"
      isLoading={isLoading}
    />
  );
}

