// /src/app/digital/oferta/[id]/page.tsx
'use client';

// Propósito: Exibir um detalhamento do desempenho de uma única oferta,
// permitindo a análise dia a dia com filtro por mês.

import { useState, useEffect, useMemo } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { formatBRL } from '@/lib/money';

// Interface para os dados diários vindos da view 'offer_summary'
interface DailyPerformance {
    day: string;
    spend_cents: number;
    revenue_cents: number;
    profit_cents: number;
    minutes: number;
}

export default function OfferDetailPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const offerId = params.id as string;
  const monthFromQuery = searchParams.get('month');

  const [offerName, setOfferName] = useState('');
  const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(
    monthFromQuery || new Date().toISOString().slice(0, 7)
  );

  // COMENTÁRIO SOBRE A BUSCA DE DADOS:
  // Os dados são buscados em duas partes:
  // 1. A view `offer_summary` fornece os agregados diários de gasto, receita e tempo.
  // 2. A tabela `sales` é consultada separadamente para obter a contagem exata de vendas
  //    aprovadas, necessária para os cálculos de CAC e Ticket Médio.
  // O filtro de data (`.gte`, `.lt`) opera sobre colunas do tipo DATE ou TIMESTAMPTZ,
  // garantindo a seleção correta do intervalo do mês.
  useEffect(() => {
    const fetchData = async () => {
      if (!session || !offerId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().slice(0, 10);
      
      const [offerRes, performanceRes, salesCountRes] = await Promise.all([
        supabase.from('offers').select('name').eq('id', offerId).single(),
        supabase.from('offer_summary').select('*').eq('offer_id', offerId).gte('day', startDate).lt('day', endDate).order('day', { ascending: true }),
        supabase.from('sales').select('id', { count: 'exact' }).eq('offer_id', offerId).eq('status', 'approved').gte('date', startDate).lt('date', endDate)
      ]);
        
      if (offerRes.error) console.error("Erro ao buscar nome da oferta:", offerRes.error);
      else if (offerRes.data) setOfferName(offerRes.data.name);

      if (performanceRes.error) console.error("Erro ao buscar desempenho diário:", performanceRes.error);
      else if (performanceRes.data) setDailyData(performanceRes.data);

      if (salesCountRes.error) console.error("Erro ao contar vendas:", salesCountRes.error);
      else if (salesCountRes.count !== null) setSalesCount(salesCountRes.count);
      
      setLoading(false);
    };

    fetchData();
  }, [supabase, session, offerId, selectedMonth]);

  // COMENTÁRIO SOBRE OS CÁLCULOS:
  // As métricas totais para o cabeçalho são agregadas a partir dos dados diários.
  // `useMemo` é usado para otimizar, recalculando apenas quando os dados de entrada mudam.
  const periodTotals = useMemo(() => {
    const totals = dailyData.reduce(
      (acc, day) => {
        acc.totalSpend += day.spend_cents;
        acc.totalRevenue += day.revenue_cents;
        acc.totalMinutes += day.minutes;
        return acc;
      },
      { totalSpend: 0, totalRevenue: 0, totalMinutes: 0 }
    );
    
    const profit = totals.totalRevenue - totals.totalSpend;
    const roi = totals.totalSpend > 0 ? profit / totals.totalSpend : 0;
    const cac = salesCount > 0 ? totals.totalSpend / salesCount : 0;
    const averageTicket = salesCount > 0 ? totals.totalRevenue / salesCount : 0;

    return { ...totals, profit, roi, cac, averageTicket };
  }, [dailyData, salesCount]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    router.push(`/digital/oferta/${offerId}?month=${newMonth}`, { scroll: false });
  };


  if (loading) {
    return <main className="p-8"><p>Carregando...</p></main>;
  }
  
  return (
    <main className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <Link href="/digital" className="text-blue-500 hover:underline">
                &larr; Voltar para o Dashboard
            </Link>
            <div className="flex items-center gap-2">
                <label htmlFor="month-selector" className="font-medium text-gray-700">Mês:</label>
                <input
                    type="month"
                    id="month-selector"
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                />
            </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h1 className="text-3xl font-bold">{offerName || 'Detalhes da Oferta'}</h1>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-4 text-sm">
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">Gasto</div>
                    <div className="text-lg font-bold">{formatBRL(periodTotals.totalSpend)}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">Receita</div>
                    <div className="text-lg font-bold text-green-600">{formatBRL(periodTotals.totalRevenue)}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">Lucro</div>
                    <div className={`text-lg font-bold ${periodTotals.profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatBRL(periodTotals.profit)}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">ROI</div>
                    <div className={`text-lg font-bold ${periodTotals.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {periodTotals.roi.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">Ticket Médio</div>
                    <div className="text-lg font-bold">{formatBRL(periodTotals.averageTicket)}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-500">Tempo (h)</div>
                    <div className="text-lg font-bold">{(periodTotals.totalMinutes/60).toFixed(1)}h</div>
                </div>
            </div>
        </div>

        {dailyData.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-lg shadow-md">
                <h2 className="font-semibold text-lg">Nenhum dado encontrado para este período.</h2>
            </div>
        ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="font-semibold text-lg mb-4">Desempenho Diário (ordenado por data)</h2>
                <ul className="divide-y divide-gray-200">
                    {dailyData.map(day => (
                        <li key={day.day} className="py-3 flex justify-between items-center">
                            <span className="font-mono">{new Date(day.day + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                            <div className="flex gap-4 text-sm">
                                <span>Gasto: <span className="font-semibold">{formatBRL(day.spend_cents)}</span></span>
                                <span>Receita: <span className="font-semibold text-green-600">{formatBRL(day.revenue_cents)}</span></span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </main>
  );
}
