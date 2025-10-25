"use client";

// ============================================================================
// Dashboard - NoCry Finance
// ============================================================================
// Propósito: Página principal do dashboard com KPIs financeiros e gráficos.
//
// ESTRUTURA:
// - DashboardHeader: Header fixo com filtros De/Até sincronizados com URL
// - Linha 1: DashboardKpis (6 cards em grid 3x2)
// - Linha 2: FinanceChart (8 col) | CheerCard (4 col)
// - Linha 3: WarningCard (4 col) | [Espaço para futuros blocos]
// - Linha 4: Desempenho Digital (KPIs + Top 5 Ofertas)
//
// COMPONENTES:
// - DashboardHeader: Filtros de período (from/to) sincronizados com QueryString
// - DashboardKpis: Grid de 6 cards (SDM, Saídas, Entradas, Orçamento, Fatura, Próxima Conta)
// - FinanceChart: Gráfico de área com série temporal de saldo
// - CheerCard: Card de incentivo (Parabéns!)
// - WarningCard: Card de avisos (Aviso!)
// - DigitalKpiRow: 5 KPIs digitais (Gasto, Receita, ROI, CAC, Ticket Médio)
// - TopOffers: Top 5 ofertas por performance
//
// PERÍODO:
// - Gerenciado por Zustand store (useDateRange)
// - Sincronizado com URL via searchParams
// - Todos os hooks de dados leem do store
//
// SINCRONIZAÇÃO:
// - DashboardHeader lê/escreve searchParams
// - Store (useDateRange) é a fonte da verdade
// - Hooks leem do store para buscar dados
//
// PRÓXIMOS PASSOS:
// - Adicionar gráfico de despesas por categoria
// - Feed de atividades recentes
// - Comparação entre períodos
// ============================================================================

import { useSession } from '@supabase/auth-helpers-react';
import DateRangeBootstrapper from '@/components/dashboard/DateRangeBootstrapper';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardKpis, { SdmProjectedCard } from '@/components/dashboard/DashboardKpis';
import MonthlyChart from '@/components/dashboard/MonthlyChart';
import CheerCard from '@/components/dashboard/CheerCard';
import WarningCard from '@/components/dashboard/WarningCard';
import DigitalKpiRow from '@/components/digital/DigitalKpiRow';
import TopOffers from '@/components/digital/TopOffers';
import { useFinanceKpis } from '@/hooks/dashboard/useFinanceKpis';
import { useBudget } from '@/hooks/dashboard/useBudget';
import { useBudgetHealth } from '@/hooks/dashboard/useBudgetHealth';
import { useCurrentInvoices } from '@/hooks/dashboard/useCurrentInvoices';
import { useDateRange } from '@/stores/dateRange';

// ============================================================================
// Componente Principal
// ============================================================================

export default function DashboardPage() {
  const session = useSession();
  const userId = session?.user?.id || null;

  // ─────────────────────────────────────────────────────────────────────
  // Período: Vem do Store Zustand (sincronizado com URL)
  // ─────────────────────────────────────────────────────────────────────
  const { from, to } = useDateRange();
  
  // Garantir defaults se null (não deve acontecer, mas TypeScript exige)
  const safeFrom = from || new Date().toISOString().slice(0, 10);
  const safeTo = to || new Date().toISOString().slice(0, 10);
  
  // Calcular monthStr para hooks legados que precisam
  const monthStr = safeFrom.slice(0, 7); // YYYY-MM

  // ─────────────────────────────────────────────────────────────────────
  // Buscar Dados para Cards (usando período do store)
  // ─────────────────────────────────────────────────────────────────────
  const { data: kpis } = useFinanceKpis({
    from: safeFrom,
    to: safeTo,
    userId: userId || '',
  });

  const { data: budget } = useBudget({
    month: monthStr,
    from: safeFrom,
    to: safeTo,
    userId: userId || '',
  });

  const { data: invoices } = useCurrentInvoices({
    userId: userId || '',
  });

  // ─────────────────────────────────────────────────────────────────────
  // Análise de Saúde do Orçamento (para cards Cheer/Warning)
  // ─────────────────────────────────────────────────────────────────────
  const biggestInvoice = invoices
    ? {
        cardName: 'Cartão Principal', // TODO: Buscar nome real do cartão
        amountCents: invoices.amountCents,
        daysToDue: invoices.daysToDue || 0,
      }
    : null;

  const { data: health } = useBudgetHealth({
    userId,
    budgetCents: budget?.totalCents || null,
    totalExpenseCents: kpis?.expenseCents || 0,
    biggestInvoice,
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          Bootstrapper: Hidrata store da URL e limpa parâmetros
          ═══════════════════════════════════════════════════════════════
          Roda apenas uma vez (primeira montagem) */}
      <DateRangeBootstrapper />

      {/* ═══════════════════════════════════════════════════════════════
          Header Estático com Filtros De/Até
          ═══════════════════════════════════════════════════════════════
          Filtros atualizam apenas o store (não tocam na URL)
          ═══════════════════════════════════════════════════════════════ */}
      <DashboardHeader />

      {/* ═══════════════════════════════════════════════════════════════
          Conteúdo Principal (com padding lateral)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════
            Linha 1 + 2: KPIs Financeiros (6 cards em 2 linhas)
            ═══════════════════════════════════════════════════════════════
            Linha 1: Saldo Líquido | Total Saídas | Total Entradas
            Linha 2: Orçamento | Fatura Atual | Próxima Conta
            ═══════════════════════════════════════════════════════════════ */}
        <DashboardKpis from={safeFrom} to={safeTo} />

        {/* ═══════════════════════════════════════════════════════════════
            Linha 3: Gráfico de Fluxo Mensal (full width)
            ═══════════════════════════════════════════════════════════════
            MUDANÇA: Substituído gráfico diário por agregação mensal
            - Exibe Receitas, Despesas e Líquido por mês
            - Últimos 12 meses até o mês atual
            - Labels em MMM/YY (ex: JAN/25)
            ═══════════════════════════════════════════════════════════════ */}
        <MonthlyChart monthsBack={12} />

        {/* ═══════════════════════════════════════════════════════════════
            Linha 4: SDM Projetado | Notificação | Status
            ═══════════════════════════════════════════════════════════════
            Grid de 3 colunas: SDM (novo card) + CheerCard + WarningCard
            ──────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* SDM Projetado (Novo) */}
          <SdmProjectedCard />

          {/* Notificação (Parabéns!) */}
          <CheerCard
            hasBudget={health?.hasBudget || false}
            pctAtingido={health?.pctAtingido || 0}
            faltaPct={health?.faltaPct || 0}
            isLoading={!userId}
          />

          {/* Status (Avisos) */}
          <WarningCard
            warn={health?.warn || { high: false, burst: false }}
            invoice={health?.invoice || null}
            isLoading={!userId}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            Linha 4: Desempenho Digital
            ═══════════════════════════════════════════════════════════════
            FONTE DE DADOS:
            - spend_events: gastos por oferta no período
            - sales: vendas aprovadas no período (status = 'approved')
            
            KPIs:
            - Gasto: soma de spend_events.amount_cents
            - Receita: soma de sales.amount_cents
            - ROI: Receita / Gasto (ou — se Gasto = 0)
            - CAC: Gasto / nº de vendas (ou — se vendas = 0)
            - Ticket Médio: Receita / nº de vendas (ou — se vendas = 0)
            
            Top 5 Ofertas:
            - Ordenado por Lucro (Receita - Gasto) DESC
            - Mostra: Nome, Gasto, Receita, ROI, Vendas
            
            FUTURO:
            - Conectar com Kiwify/UTMify via webhooks
            - Adicionar métricas de LTV, conversão por fonte/UTM
            - Gráfico de tendência (gasto x receita ao longo do tempo)
            ──────────────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
              Desempenho Digital
            </h2>
            <DigitalKpiRow userId={userId} from={safeFrom} to={safeTo} />
          </div>

          <TopOffers userId={userId} from={safeFrom} to={safeTo} />
        </div>
      </div>
    </>
  );
}

