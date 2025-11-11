// ============================================================================
// components/analytics/flow/IncomeExpenseChart.tsx - Gráfico Entradas/Saídas
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
} from 'recharts';
import { formatBRL } from '@/lib/money';

type DataPoint = {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  ma3Cents?: number;
};

type IncomeExpenseChartProps = {
  data: DataPoint[];
};

export default function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        
        <XAxis
          dataKey="month"
          stroke="#9F9D9D"
          tick={{ fill: '#9F9D9D', fontSize: 12 }}
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
        
        <Line
          type="monotone"
          dataKey="incomeCents"
          stroke="#10b981"
          strokeWidth={2}
          name="Entradas"
          dot={{ fill: '#10b981', r: 4 }}
        />
        
        <Line
          type="monotone"
          dataKey="expenseCents"
          stroke="#ef4444"
          strokeWidth={2}
          name="Saídas"
          dot={{ fill: '#ef4444', r: 4 }}
        />
        
        <Line
          type="monotone"
          dataKey="netCents"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Líquido"
          dot={{ fill: '#3b82f6', r: 4 }}
        />
        
        {/* Média Móvel 3 meses */}
        {data.some((d) => d.ma3Cents !== undefined) && (
          <Line
            type="monotone"
            dataKey="ma3Cents"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="MA3 (Líquido)"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

