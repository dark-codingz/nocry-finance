// ============================================================================
// components/analytics/flow/CumulativeChart.tsx - S-curve (Gasto Acumulado vs Orçamento)
// ============================================================================

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatBRL } from '@/lib/money';

type DataPoint = {
  day: number;
  cumulativeCents: number;
  budgetLineCents: number;
};

type CumulativeChartProps = {
  data: DataPoint[];
  currentDay: number;
};

export default function CumulativeChart({ data, currentDay }: CumulativeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        
        <XAxis
          dataKey="day"
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 12 }}
          label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5, fill: '#9F9D9D' }}
        />
        
        <YAxis
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 12 }}
          tickFormatter={(value) => formatBRL(value / 100)}
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
        
        {/* Linha do orçamento ideal (slope linear) */}
        <Line
          type="monotone"
          dataKey="budgetLineCents"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Orçamento Ideal"
          dot={false}
        />
        
        {/* Linha do gasto real acumulado */}
        <Line
          type="monotone"
          dataKey="cumulativeCents"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Gasto Acumulado"
          dot={{ fill: '#3b82f6', r: 3 }}
        />
        
        {/* Linha vertical do dia atual */}
        <ReferenceLine
          x={currentDay}
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="3 3"
          label={{ value: 'Hoje', position: 'top', fill: '#f59e0b' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

