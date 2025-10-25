"use client";

// ============================================================================
// DashboardKpis - Grid de KPIs Financeiros
// ============================================================================
// Propósito: Renderizar a primeira faixa de cards do dashboard com dados reais.
//
// ESTRUTURA:
// - Linha 1: SDM (4 col) | Total Saídas (4 col) | Total Entradas (4 col)
// - Linha 2: Orçamento (4 col) | Fatura Atual (4 col) | Próxima Conta (4 col)
//
// ORIGEM DOS DADOS:
// - useFinanceKpis: SDM, Entradas, Saídas
// - useBudget: Orçamento do mês
// - useCurrentInvoices: Faturas em aberto
// - useNextFixedBill: Próxima conta fixa
//
// PARÂMETROS:
// - from/to: Período selecionado (ISO dates)
// - userId: ID do usuário autenticado
//
// PRÓXIMOS PASSOS:
// - Conectar ao context de filtros de data do Header
// - Adicionar error boundaries
// - Implementar retry automático
// ============================================================================

import { useSession } from '@supabase/auth-helpers-react';
import { TrendingDown, ArrowUpRight } from 'lucide-react';
import { formatBRL } from '@/lib/money';
import { useFinanceKpis } from '@/hooks/dashboard/useFinanceKpis';
import { useBudget } from '@/hooks/dashboard/useBudget';
import { useCurrentInvoices } from '@/hooks/dashboard/useCurrentInvoices';
import { useNextFixedBill } from '@/hooks/dashboard/useNextFixedBill';
import KpiCard from './kpis/KpiCard';
import BudgetCard from './kpis/BudgetCard';
import InvoiceCard from './kpis/InvoiceCard';
import NextBillCard from './kpis/NextBillCard';
import SaldoLiquidoCard from './kpis/SaldoLiquidoCard';
import SdmProjectedCard from './kpis/SdmProjectedCard';

// ============================================================================
// Tipos
// ============================================================================

interface DashboardKpisProps {
  from?: string;  // ISO date (YYYY-MM-DD)
  to?: string;    // ISO date (YYYY-MM-DD)
}

// ============================================================================
// Helper: Calcular período padrão (mês atual)
// ============================================================================

function getCurrentMonthRange(): { from: string; to: string; month: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  const from = firstDay.toISOString().split('T')[0];
  const to = lastDay.toISOString().split('T')[0];
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  return { from, to, month: monthStr };
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function DashboardKpis({ from, to }: DashboardKpisProps) {
  const session = useSession();
  const userId = session?.user?.id;

  // ─────────────────────────────────────────────────────────────────────
  // Período: Usar props ou padrão (mês atual)
  // ─────────────────────────────────────────────────────────────────────
  const period = from && to
    ? { from, to, month: from.substring(0, 7) }
    : getCurrentMonthRange();

  // ─────────────────────────────────────────────────────────────────────
  // Buscar Dados
  // ─────────────────────────────────────────────────────────────────────
  const { data: kpis, isLoading: isLoadingKpis } = useFinanceKpis({
    from: period.from,
    to: period.to,
    userId: userId || '',
  });

  const { data: budget, isLoading: isLoadingBudget } = useBudget({
    month: period.month,
    from: period.from,
    to: period.to,
    userId: userId || '',
  });

  const { data: invoice, isLoading: isLoadingInvoice } = useCurrentInvoices({
    userId: userId || '',
  });

  const { data: nextBill, isLoading: isLoadingBill } = useNextFixedBill({
    userId: userId || '',
  });

  // ─────────────────────────────────────────────────────────────────────
  // Renderização
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-6">
      {/* ═══════════════════════════════════════════════════════════════
          LINHA 1: Saldo Líquido (Realizado), Total Saídas, Total Entradas
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Saldo Líquido (Realizado) - Renomeado do antigo SDM */}
        <SaldoLiquidoCard />

        {/* Total Saídas */}
        <KpiCard
          label="Total Saídas"
          value={isLoadingKpis ? '...' : formatBRL(kpis?.expenseCents || 0)}
          icon={TrendingDown}
        />

        {/* Total Entradas */}
        <KpiCard
          label="Total Entradas"
          value={isLoadingKpis ? '...' : formatBRL(kpis?.incomeCents || 0)}
          icon={ArrowUpRight}
          iconHighlight={(kpis?.incomeCents || 0) > 0}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          LINHA 2: Orçamento, Fatura Atual, Próxima Conta
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Orçamento do Mês */}
        <BudgetCard budget={budget || null} isLoading={isLoadingBudget} />

        {/* Fatura Atual */}
        <InvoiceCard invoice={invoice || null} isLoading={isLoadingInvoice} />

        {/* Próxima Conta */}
        <NextBillCard bill={nextBill || null} isLoading={isLoadingBill} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Export para uso em page.tsx (Linha 4: SDM Projetado)
// ────────────────────────────────────────────────────────────────────────────
export { SdmProjectedCard };


