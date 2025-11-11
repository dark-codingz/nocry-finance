// ============================================================================
// components/analytics/credit/InvoiceGauge.tsx - Gauge de Utilização de Crédito
// ============================================================================

'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { formatBRL } from '@/lib/money';

type InvoiceGaugeProps = {
  used_cents: number;
  limit_cents: number;
  cardName?: string;
};

export default function InvoiceGauge({
  used_cents,
  limit_cents,
  cardName = 'Cartão',
}: InvoiceGaugeProps) {
  const available_cents = Math.max(0, limit_cents - used_cents);
  const utilization_pct = limit_cents > 0 ? (used_cents / limit_cents) * 100 : 0;

  const data = [
    { name: 'Usado', value: used_cents, color: '#ef4444' },
    { name: 'Disponível', value: available_cents, color: '#10b981' },
  ];

  // Cor do gauge baseado na utilização
  const gaugeColor =
    utilization_pct > 60 ? '#ef4444' : utilization_pct > 30 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          
          <Tooltip
            formatter={(value: number) => formatBRL(value / 100)}
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
            }}
          />
          
          <Legend
            wrapperStyle={{ color: '#9F9D9D', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Título e Percentual */}
      <div className="flex flex-col items-center mt-2">
        <span className="text-sm text-[#9F9D9D]">{cardName}</span>
        <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
          {utilization_pct.toFixed(1)}%
        </span>
        <span className="text-xs text-[#9F9D9D]">
          {formatBRL(used_cents / 100)} / {formatBRL(limit_cents / 100)}
        </span>
      </div>
    </div>
  );
}

