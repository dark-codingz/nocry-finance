// ============================================================================
// components/analytics/categories/BudgetDeviationChart.tsx - Desvio vs Orçamento
// ============================================================================

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatBRL } from '@/lib/money';

type DataPoint = {
  category_name: string;
  budget_cents: number;
  actual_cents: number;
  variance_cents: number;
};

type BudgetDeviationChartProps = {
  data: DataPoint[];
};

export default function BudgetDeviationChart({ data }: BudgetDeviationChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        
        <XAxis
          type="number"
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 12 }}
          tickFormatter={(value) => formatBRL(value / 100)}
        />
        
        <YAxis
          type="category"
          dataKey="category_name"
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 11 }}
          width={120}
        />
        
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fff' }}
          formatter={(value: number) => formatBRL(value / 100)}
        />
        
        <Legend
          wrapperStyle={{ color: '#9F9D9D' }}
        />
        
        {/* Linha de referência (zero) */}
        <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
        
        {/* Barra de variação (negativo = economia, positivo = estouro) */}
        <Bar dataKey="variance_cents" name="Desvio">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.variance_cents < 0 ? '#10b981' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

