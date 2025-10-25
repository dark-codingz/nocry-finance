// /src/components/DigitalSummaryCards.tsx
'use client';

// Propósito: Exibir um conjunto de cards com as métricas de resumo
// para o dashboard digital.

import { formatBRL } from '@/lib/money';
import MoneyCard from './MoneyCard';

interface DigitalSummaryCardsProps {
  data: {
    totalRevenue: number;
    totalSpend: number;
    totalSales: number;
    totalMinutes: number;
  };
}

export default function DigitalSummaryCards({ data }: DigitalSummaryCardsProps) {
    // Fórmulas de cálculo:
    // - ROI (Return on Investment) = (Receita - Gasto) / Gasto
    // - CAC (Custo de Aquisição de Cliente) = Gasto Total / Número de Vendas
    // - Ticket Médio = Receita Total / Número de Vendas

    const profit = data.totalRevenue - data.totalSpend;
    const roi = data.totalSpend > 0 ? profit / data.totalSpend : 0;
    const cac = data.totalSales > 0 ? data.totalSpend / data.totalSales : 0;
    const averageTicket = data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0;
    const totalHours = data.totalMinutes > 0 ? data.totalMinutes / 60 : 0;
  
    return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">Gasto</h3>
        <p className="mt-1 text-2xl font-semibold">{formatBRL(data.totalSpend)}</p>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">Receita</h3>
        <p className="mt-1 text-2xl font-semibold text-green-600">{formatBRL(data.totalRevenue)}</p>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">ROI</h3>
        <p className={`mt-1 text-2xl font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {roi.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 0 })}
        </p>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">CAC</h3>
        <p className="mt-1 text-2xl font-semibold">{formatBRL(cac)}</p>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">Ticket Médio</h3>
        <p className="mt-1 text-2xl font-semibold">{formatBRL(averageTicket)}</p>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500">Tempo (h)</h3>
        <p className="mt-1 text-2xl font-semibold">{totalHours.toFixed(1)}h</p>
      </div>
    </div>
  );
}
