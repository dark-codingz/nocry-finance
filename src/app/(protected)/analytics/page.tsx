// ============================================================================
// app/(protected)/analytics/page.tsx - Página Analytics (FASE 1)
// ============================================================================

'use client';

import { Suspense } from 'react';
import GlobalFilters from '@/components/analytics/filters/GlobalFilters';
import HealthKpisPanel from '@/components/analytics/kpis/HealthKpisPanel';
import FlowTrendsPanel from '@/components/analytics/flow/FlowTrendsPanel';
import CategoriesParetoPanel from '@/components/analytics/categories/CategoriesParetoPanel';
import CreditPanel from '@/components/analytics/credit/CreditPanel';
import DrilldownPanel from '@/components/analytics/drilldown/DrilldownPanel';

// ────────────────────────────────────────────────────────────────────────────
// LOADING FALLBACKS
// ────────────────────────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="glass rounded-2xl border border-white/10 p-6 animate-pulse">
      <div className="h-64 bg-white/5 rounded" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <main className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">📊 Analytics</h1>
        <p className="text-[#9F9D9D]">
          Análise avançada de finanças pessoais com KPIs, gráficos e drill-down
        </p>
      </div>

      {/* Filtros Globais */}
      <Suspense fallback={<SectionSkeleton />}>
        <GlobalFilters />
      </Suspense>

      {/* KPIs de Saúde */}
      <Suspense fallback={<SectionSkeleton />}>
        <HealthKpisPanel />
      </Suspense>

      {/* Fluxo & Tendências */}
      <Suspense fallback={<SectionSkeleton />}>
        <FlowTrendsPanel />
      </Suspense>

      {/* Categorias & Pareto */}
      <Suspense fallback={<SectionSkeleton />}>
        <CategoriesParetoPanel />
      </Suspense>

      {/* Crédito & Faturas */}
      <Suspense fallback={<SectionSkeleton />}>
        <CreditPanel />
      </Suspense>

      {/* Drill-down (Tabela Dinâmica) */}
      <Suspense fallback={<SectionSkeleton />}>
        <DrilldownPanel />
      </Suspense>

      {/* Footer */}
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-[#9F9D9D]">
          Analytics FASE 1 • NoCry Finance
        </span>
      </div>
    </main>
  );
}
