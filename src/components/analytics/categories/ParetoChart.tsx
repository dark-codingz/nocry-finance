// ============================================================================
// components/analytics/categories/ParetoChart.tsx - Gráfico Pareto 80/20
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
  Line,
  ComposedChart,
} from 'recharts';
import { formatBRL } from '@/lib/money';

type DataPoint = {
  categoryName: string;
  totalCents: number;
  cumulativePercentage: number;
};

type ParetoChartProps = {
  data: DataPoint[];
  onClickCategory?: (categoryName: string) => void;
};

export default function ParetoChart({ data, onClickCategory }: ParetoChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        
        <XAxis
          type="number"
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 12 }}
        />
        
        <YAxis
          type="category"
          dataKey="categoryName"
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
          formatter={(value: number, name: string) => {
            if (name === 'totalCents') {
              return [formatBRL(value / 100), 'Valor'];
            }
            return [`${value.toFixed(1)}%`, '% Acumulado'];
          }}
        />
        
        <Legend
          wrapperStyle={{ color: '#9F9D9D' }}
        />
        
        {/* Barras de valor */}
        <Bar
          dataKey="totalCents"
          fill="#3b82f6"
          name="Gasto"
          onClick={(data: any) => {
            if (onClickCategory && data && data.categoryName) {
              onClickCategory(data.categoryName);
            }
          }}
          cursor="pointer"
        />
        
        {/* Linha de % acumulado (Pareto) */}
        <Line
          type="monotone"
          dataKey="cumulativePercentage"
          stroke="#f59e0b"
          strokeWidth={2}
          name="% Acumulado"
          yAxisId="right"
          dot={{ fill: '#f59e0b', r: 3 }}
        />
        
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#f59e0b"
          tick={{ fill: '#f59e0b', fontSize: 12 }}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

