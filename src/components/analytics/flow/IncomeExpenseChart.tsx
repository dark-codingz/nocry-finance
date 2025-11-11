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
  income_cents: number;
  expense_cents: number;
  net_cents: number;
  ma3_cents?: number;
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
          dataKey="income_cents"
          stroke="#10b981"
          strokeWidth={2}
          name="Entradas"
          dot={{ fill: '#10b981', r: 4 }}
        />
        
        <Line
          type="monotone"
          dataKey="expense_cents"
          stroke="#ef4444"
          strokeWidth={2}
          name="Saídas"
          dot={{ fill: '#ef4444', r: 4 }}
        />
        
        <Line
          type="monotone"
          dataKey="net_cents"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Líquido"
          dot={{ fill: '#3b82f6', r: 4 }}
        />
        
        {/* Média Móvel 3 meses */}
        {data.some((d) => d.ma3_cents !== undefined) && (
          <Line
            type="monotone"
            dataKey="ma3_cents"
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

