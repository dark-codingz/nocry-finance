// ============================================================================
// components/analytics/credit/CreditPanel.tsx - Painel de Crédito
// ============================================================================

'use client';

import { useCreditData } from '@/hooks/analytics/useCreditData';
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import ChartWrapper from '@/components/analytics/shared/ChartWrapper';
import InvoiceGauge from './InvoiceGauge';

export default function CreditPanel() {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error } = useCreditData(filters);

  return (
    <div className="flex flex-col gap-6">
      <ChartWrapper
        title="Utilização de Crédito"
        subtitle="Saldo aberto vs limite por cartão"
        isLoading={isLoading}
        error={error || undefined}
        height={400}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {/* Gauge Agregado */}
          {data && data.aggregate && (
            <InvoiceGauge
              used_cents={data.aggregate.totalUsedCents}
              limit_cents={data.aggregate.totalLimitCents}
              cardName="TOTAL"
            />
          )}

          {/* Gauges por Cartão */}
          {data?.cards.map((card) => (
            <InvoiceGauge
              key={card.cardId}
              used_cents={card.usedCents}
              limit_cents={card.limitCents}
              cardName={card.cardName || 'Cartão'}
            />
          ))}
        </div>
      </ChartWrapper>
    </div>
  );
}

