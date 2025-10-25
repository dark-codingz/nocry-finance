"use client";

// ============================================================================
// FinanceChart - Gráfico de Desempenho Financeiro (Área)
// ============================================================================
// Propósito: Exibir série temporal de saldo diário acumulado.
//
// DESIGN:
// - Card .glass com altura fixa (320px)
// - AreaChart com gradiente dourado (fill) e linha dourada (stroke)
// - Eixo X: dd/MM
// - Eixo Y: Oculto (valores no tooltip)
// - Tooltip: Formatado em BRL com sinal (+/-)
//
// ESTADOS:
// - Loading: Skeleton de barras
// - Erro: Mensagem + botão "Tentar de novo"
// - Vazio: "Nenhuma transação no período"
// - Dados: Gráfico completo
//
// ACESSIBILIDADE:
// - aria-label descritivo
// - role="img" no container do gráfico
// ============================================================================

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { formatBRL } from '@/lib/money';
import type { FinanceSeriesDataPoint } from '@/hooks/dashboard/useFinanceSeries';

// ============================================================================
// Tipos
// ============================================================================

interface FinanceChartProps {
  data: FinanceSeriesDataPoint[];
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

// ============================================================================
// Subcomponentes
// ============================================================================

function SkeletonChart() {
  // Alturas fixas para evitar hydration mismatch
  const heights = [75, 115, 90, 135, 105, 80, 125, 95, 110, 85, 120, 100];
  
  return (
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[320px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-48 bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-10 w-10 bg-nocry-goldDark/20 rounded-lg animate-pulse" />
      </div>
      <div className="h-[240px] flex items-end justify-between gap-2">
        {heights.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-nocry-goldDark/20 rounded-t animate-pulse"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[320px] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <p className="text-nocry-text text-sm">Erro ao carregar o gráfico.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-nocry-gold text-black font-semibold rounded-lg hover:brightness-95 transition-all"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[320px] flex flex-col items-center justify-center gap-2">
      <TrendingUp className="w-12 h-12 text-nocry-muted" />
      <p className="text-nocry-text text-sm">Nenhuma transação no período selecionado.</p>
      <p className="text-nocry-muted text-xs">
        Ajuste as datas ou adicione transações para ver o gráfico.
      </p>
    </div>
  );
}

// ============================================================================
// Tooltip Customizado
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const date = dayjs(data.dateISO).format('DD/MM/YYYY');
  const balanceCents = data.balanceCents;
  const sign = balanceCents >= 0 ? '+' : '';

  return (
    <div className="glass-strong rounded-lg p-3 border border-white/20 shadow-xl">
      <p className="text-nocry-muted text-xs mb-1">{date}</p>
      <p className={`text-lg font-bold ${balanceCents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {sign}{formatBRL(balanceCents)}
      </p>
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function FinanceChart({ data, isLoading, error, onRetry }: FinanceChartProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Estados
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) return <SkeletonChart />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!data || data.length === 0) return <EmptyState />;

  // ─────────────────────────────────────────────────────────────────────
  // Transformação de Dados para Recharts
  // ─────────────────────────────────────────────────────────────────────
  const chartData = data.map((point) => ({
    ...point,
    date: dayjs(point.dateISO).format('DD/MM'), // Eixo X: dd/MM
    balance: point.balanceCents / 100, // Converte para reais (para formatação)
  }));

  return (
    <div
      className="glass rounded-xl2 p-6 border border-white/10 h-[320px]"
      role="img"
      aria-label="Gráfico de desempenho financeiro ao longo do tempo"
    >
      {/* ────────────────────────────────────────────────────────────────
          Header: Título + Ícone
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-nocry-text text-lg font-semibold">Desempenho Finanças</h3>
        <div className="h-10 w-10 rounded-lg bg-nocry-goldDark border border-white/10 grid place-items-center">
          <TrendingUp className="w-5 h-5 text-nocry-gold" />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Gráfico de Área (Recharts)
          ────────────────────────────────────────────────────────────────
          NOTA: ResponsiveContainer ajusta automaticamente ao container pai.
          
          GRADIENTE:
          - id="goldGradient" definido no defs
          - stop color #D4AF37 (dourado) com opacidade decrescente
          
          ÁREA:
          - dataKey="balanceCents" (em centavos para precisão)
          - stroke="#D4AF37" (linha dourada)
          - fill="url(#goldGradient)" (gradiente)
          
          EIXOS:
          - XAxis: Exibe dd/MM, cor #8b8b8b (muted)
          - YAxis: Oculto (hide=true)
          
          TOOLTIP:
          - Customizado com formatação BRL
          ──────────────────────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          
          <XAxis
            dataKey="date"
            stroke="#8b8b8b"
            tick={{ fill: '#8b8b8b', fontSize: 12 }}
            tickLine={{ stroke: '#8b8b8b' }}
          />
          
          <YAxis hide />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D4AF37', strokeWidth: 1 }} />
          
          <Area
            type="monotone"
            dataKey="balanceCents"
            stroke="#D4AF37"
            strokeWidth={2}
            fill="url(#goldGradient)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


