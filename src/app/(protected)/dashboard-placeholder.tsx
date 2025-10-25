"use client";

// ============================================================================
// Dashboard - NoCry Finance
// ============================================================================
// Propósito: Página principal do dashboard com KPIs financeiros.
//
// COMPONENTES:
// - DashboardKpis: Grid de 6 cards (SDM, Saídas, Entradas, Orçamento, Fatura, Próxima Conta)
//
// PRÓXIMOS PASSOS:
// - Adicionar gráficos (receitas/despesas por categoria)
// - Adicionar atividades recentes
// - Conectar filtros de data do Header
// ============================================================================

import DashboardKpis from '@/components/dashboard/DashboardKpis';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          KPIs Financeiros
          ═══════════════════════════════════════════════════════════════ */}
      <DashboardKpis />

      {/* ═══════════════════════════════════════════════════════════════
          Seções Futuras (comentadas)
          ═══════════════════════════════════════════════════════════════
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpensesByCategoryChart />
        <RecentTransactions />
      </div>

      ═══════════════════════════════════════════════════════════════ */}
    </div>
  );
}

