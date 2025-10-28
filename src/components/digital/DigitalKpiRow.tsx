// src/components/digital/DigitalKpiRow.tsx
// ============================================================================
// Linha de KPIs do Desempenho Digital
// ============================================================================
//
// ESTRUTURA:
// - Grid responsivo: 1 coluna (mobile) → 2 cols (tablet) → 5 cols (desktop)
// - 5 KPIs: Gasto, Receita, ROI, CAC, Ticket Médio
//
// LÓGICA DE CORES:
// - GASTO: text-red-400 (sempre)
// - RECEITA: text-green-400 (sempre)
// - ROI: verde se >= 1.0, amarelo se 0.8-1.0, vermelho se < 0.8
// - CAC: verde se <= Ticket Médio, senão default
// - TICKET MÉDIO: default (branco)
//
// LOADING / ERRO:
// - Loading: skeleton retangulares baixos
// - Erro: texto "Falha ao carregar" + botão "Tentar de novo"
// ============================================================================

'use client';

import { useDigitalKpis } from '@/hooks/digital/useDigitalKpis';
import { formatBRL } from '@/lib/money';
import DigitalKpi from './DigitalKpi';

interface DigitalKpiRowProps {
  userId: string | null;
  from: string;
  to: string;
}

export default function DigitalKpiRow({ userId, from, to }: DigitalKpiRowProps) {
  const { data, isLoading, isError, refetch } = useDigitalKpis({ userId, from, to });

  // ─────────────────────────────────────────────────────────────────────
  // Estado: Loading
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="glass rounded-xl px-5 py-4 border border-white/10 h-24 animate-pulse bg-white/5"
          />
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Estado: Erro
  // ─────────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="glass rounded-xl px-6 py-8 border border-white/10 text-center">
        <p className="text-nocry-text mb-4">Falha ao carregar KPIs digitais</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-nocry-gold text-nocry-bg rounded-lg hover:bg-nocry-gold/90 transition-colors"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Formatação de Valores
  // ─────────────────────────────────────────────────────────────────────

  const spendText = formatBRL(data.spendCents);
  const revenueText = formatBRL(data.revenueCents);

  // ROI: formato "2.5x" ou "—"
  const roiText = data.roi !== null ? `${data.roi.toFixed(1)}x` : '—';

  // CAC: formato BRL ou "—"
  const cacText = data.cacCents !== null ? formatBRL(data.cacCents) : '—';

  // Ticket Médio: formato BRL ou "—"
  const ticketText = data.ticketCents !== null ? formatBRL(data.ticketCents) : '—';

  // ─────────────────────────────────────────────────────────────────────
  // Lógica de Cores (State)
  // ─────────────────────────────────────────────────────────────────────

  // ROI: verde >= 1.0, amarelo 0.8-1.0, vermelho < 0.8
  let roiState: 'ok' | 'warning' | 'danger' | 'default' = 'default';
  if (data.roi !== null) {
    if (data.roi >= 1.0) roiState = 'ok';
    else if (data.roi >= 0.8) roiState = 'warning';
    else roiState = 'danger';
  }

  // CAC: verde se <= Ticket Médio (quando ambos existirem)
  let cacState: 'ok' | 'default' = 'default';
  if (
    data.cacCents !== null &&
    data.ticketCents !== null &&
    data.cacCents <= data.ticketCents
  ) {
    cacState = 'ok';
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* GASTO */}
      <DigitalKpi title="Gasto" valueText={spendText} state="danger" />

      {/* RECEITA */}
      <DigitalKpi title="Receita" valueText={revenueText} state="ok" />

      {/* ROI */}
      <DigitalKpi
        title="ROI"
        valueText={roiText}
        state={roiState}
        subtleText={data.roi !== null && data.roi >= 1 ? 'Positivo' : undefined}
      />

      {/* CAC */}
      <DigitalKpi
        title="CAC"
        valueText={cacText}
        state={cacState}
        subtleText="Custo p/ cliente"
      />

      {/* TICKET MÉDIO */}
      <DigitalKpi
        title="Ticket Médio"
        valueText={ticketText}
        subtleText={`${data.salesCount} vendas`}
      />
    </div>
  );
}




