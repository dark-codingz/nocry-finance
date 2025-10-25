// /src/components/OffersTable.tsx
'use client';

// Propósito: Exibir uma tabela com o desempenho detalhado de cada oferta,
// permitindo a comparação e o acesso rápido aos detalhes individuais.

import Link from 'next/link';
import { formatBRL } from '@/lib/money';

export interface OfferPerformanceData {
  offer_id: string;
  offer_name: string;
  total_spend: number;
  total_revenue: number;
  total_sales: number;
  total_minutes: number;
}

interface OffersTableProps {
  data: OfferPerformanceData[];
  selectedMonth: string;
}

export default function OffersTable({ data, selectedMonth }: OffersTableProps) {
    if (data.length === 0) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 className="text-xl font-semibold">Nenhuma atividade registrada este mês.</h2>
                <p className="text-gray-500 mt-2">Comece registrando um gasto ou uma venda.</p>
            </div>
        )
    }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oferta</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo (h)</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((offer) => {
            const profit = offer.total_revenue - offer.total_spend;
            const roi = offer.total_spend > 0 ? profit / offer.total_spend : 0;
            const hours = offer.total_minutes / 60;

            return (
              <tr key={offer.offer_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/digital/oferta/${offer.offer_id}?month=${selectedMonth}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                    {offer.offer_name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatBRL(offer.total_spend)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-green-600 font-semibold">{formatBRL(offer.total_revenue)}</td>
                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatBRL(profit)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roi.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 0 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{offer.total_sales}</td>
                <td className="px-6 py-4 whitespace-nowrap">{hours.toFixed(1)}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
