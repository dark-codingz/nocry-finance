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
          {data && (
            <InvoiceGauge
              used_cents={data.totalUsed_cents}
              limit_cents={data.totalLimit_cents}
              cardName="TOTAL"
            />
          )}

          {/* Gauges por Cartão */}
          {data?.byCard.map((card) => (
            <InvoiceGauge
              key={card.card_id}
              used_cents={card.used_cents}
              limit_cents={card.limit_cents}
              cardName={card.card_name || 'Cartão'}
            />
          ))}
        </div>
      </ChartWrapper>
    </div>
  );
}

