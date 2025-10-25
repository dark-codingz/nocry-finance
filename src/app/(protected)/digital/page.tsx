// /src/app/digital/page.tsx
'use client';

// Propósito: Orquestrar e exibir o dashboard de desempenho digital,
// permitindo a filtragem por mês e apresentando métricas agregadas e detalhadas.

import { useState, useEffect, useMemo } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import DigitalSummaryCards from '@/components/DigitalSummaryCards';
import OffersTable, { OfferPerformanceData } from '@/components/OffersTable';
import DevWarning from '@/components/ui/DevWarning';
import { useIsAdmin } from '@/hooks/useIsAdmin';

// NOTA SOBRE A BUSCA DE DADOS:
// A busca é feita no lado do cliente (`useEffect`) para permitir interatividade
// (como a troca de mês) sem recarregar a página inteira.
//
// Otimização: Em vez de múltiplas chamadas ao DB, uma única chamada a uma função
// de banco de dados (RPC) customizada no Supabase poderia agregar todos os dados
// necessários de forma mais eficiente, reduzindo a latência.

export default function DigitalDashboardPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin();
  const [data, setData] = useState<OfferPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // TODO: Transformar em um seletor de mês real. Por enquanto, usa o mês atual.
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Formato 'YYYY-MM'

  // ─────────────────────────────────────────────────────────────────────
  // Guard: Apenas admins podem acessar esta página (em desenvolvimento)
  // ─────────────────────────────────────────────────────────────────────
  if (isLoadingAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[#CACACA]">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <DevWarning />;
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!session) {
        setLoading(false);
        return;
      };
      setLoading(true);

      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().slice(0, 10);

      // 1. Busca os dados agregados da VIEW
      const { data: summaryData, error: summaryError } = await supabase
        .from('offer_summary')
        .select('*')
        .gte('day', startDate)
        .lt('day', endDate);
      
      if (summaryError) {
        console.error("Erro ao buscar dados da view:", summaryError);
        setLoading(false);
        return;
      }

      // 2. Busca a contagem de vendas aprovadas para cada oferta
      const { data: salesCountData, error: salesCountError } = await supabase
        .from('sales')
        .select('offer_id, id')
        .eq('status', 'approved')
        .gte('date', startDate)
        .lt('date', endDate);

      if (salesCountError) {
        console.error("Erro ao contar vendas:", salesCountError);
        setLoading(false);
        return;
      }
      
      // 3. Busca os nomes de todas as ofertas do usuário
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, name');

      if (offersError) {
        console.error("Erro ao buscar ofertas:", offersError);
        setLoading(false);
        return;
      }

      // 4. Combina os dados
      const performanceData: OfferPerformanceData[] = offers.map(offer => {
          const relatedSummaries = summaryData.filter(s => s.offer_id === offer.id);
          const relatedSales = salesCountData.filter(s => s.offer_id === offer.id);

          return {
              offer_id: offer.id,
              offer_name: offer.name,
              total_spend: relatedSummaries.reduce((acc, s) => acc + s.spend_cents, 0),
              total_revenue: relatedSummaries.reduce((acc, s) => acc + s.revenue_cents, 0),
              total_sales: relatedSales.length,
              total_minutes: relatedSummaries.reduce((acc, s) => acc + s.minutes, 0),
          }
      });

      setData(performanceData);
      setLoading(false);
    };

    fetchData();
  }, [supabase, session, selectedMonth]);

  const summaryData = useMemo(() => {
    return data.reduce(
      (acc, offer) => {
        acc.totalRevenue += offer.total_revenue;
        acc.totalSpend += offer.total_spend;
        acc.totalSales += offer.total_sales;
        acc.totalMinutes += offer.total_minutes;
        return acc;
      },
      { totalRevenue: 0, totalSpend: 0, totalSales: 0, totalMinutes: 0 }
    );
  }, [data]);
  
  if (!session) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="text-center">
                <p>Você precisa estar logado para ver esta página.</p>
            </div>
        </main>
    )
  }

  return (
    <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Dashboard Digital</h1>
            <div className="flex items-center gap-2">
                <label htmlFor="month-selector" className="font-medium text-gray-700">Mês:</label>
                <input
                    type="month"
                    id="month-selector"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                />
            </div>
        </div>
      
      {loading ? (
        <p>Carregando dados...</p>
      ) : (
        <div className="space-y-8">
          <DigitalSummaryCards data={summaryData} />
          <OffersTable data={data} selectedMonth={selectedMonth} />
        </div>
      )}
    </main>
  );
}
