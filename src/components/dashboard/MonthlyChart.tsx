"use client";

// ============================================================================
// MonthlyChart - Gráfico de Fluxo Mensal (Receitas, Despesas, Líquido)
// ============================================================================
// PROPÓSITO:
// - Exibir série temporal mensal de receitas, despesas e líquido
// - Substituir gráfico diário por agregação mensal
// - Preencher meses sem movimento com zero
// - Labels no padrão MMM/YY (ex: JAN/25, FEV/25)
//
// DESIGN:
// - Card glass com altura fixa (~340px)
// - AreaChart com 3 áreas:
//   * Receitas: Dourado (#D4AF37)
//   * Despesas: Vermelho (#ff6b6b)
//   * Líquido: Azul claro (#9ad0f5)
// - Tooltip formatado em BRL
// - Legend para identificar as séries
//
// ESTADOS:
// - Loading: Skeleton animado
// - Erro: Mensagem + botão retry
// - Vazio: Mensagem "Sem dados"
// - Dados: Gráfico completo
// ============================================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { usePfMonthlySeries } from '@/hooks/analytics';
import { formatBRL } from '@/lib/money';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converte 'YYYY-MM' para 'MMM/YY' em pt-BR (maiúsculas, sem ponto)
 * @example labelMonth('2025-01') => 'JAN/25'
 */
function labelMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return (
    d
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase() +
    '/' +
    String(y).slice(-2)
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponentes: Estados
// ────────────────────────────────────────────────────────────────────────────

function SkeletonChart() {
  // Alturas fixas para evitar hydration mismatch
  const heights = [80, 120, 95, 140, 110, 85, 130, 100, 115, 90, 125, 105];
  
  return (
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-48 bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-10 w-10 bg-nocry-goldDark/20 rounded-lg animate-pulse" />
      </div>
      <div className="h-[260px] flex items-end justify-between gap-2">
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
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[340px] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <p className="text-nocry-text text-sm">Erro ao carregar gráfico mensal.</p>
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
    <div className="glass rounded-xl2 p-6 border border-white/10 h-[340px] flex flex-col items-center justify-center gap-2">
      <TrendingUp className="w-12 h-12 text-nocry-muted" />
      <p className="text-nocry-text text-sm">Nenhuma transação nos últimos meses.</p>
      <p className="text-nocry-muted text-xs">
        Adicione transações para ver o gráfico de fluxo.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tooltip Customizado
// ────────────────────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-strong rounded-lg p-3 border border-white/20 shadow-xl">
      <p className="text-nocry-muted text-xs mb-2">Mês: {label}</p>
      {payload.map((entry: any) => {
        let name = entry.name;
        let color = entry.color;

        // Traduzir nomes
        if (name === 'income') name = 'Receitas';
        if (name === 'expense') name = 'Despesas';
        if (name === 'net') name = 'Líquido';

        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <span className="text-xs" style={{ color }}>
              {name}:
            </span>
            <span className="text-sm font-bold text-white">
              {formatBRL((entry.value ?? 0) * 100)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────

export interface MonthlyChartProps {
  monthsBack?: number;
}

export default function MonthlyChart({ monthsBack = 12 }: MonthlyChartProps) {
  const { data = [], isLoading, error, refetch } = usePfMonthlySeries(monthsBack);

  // ──────────────────────────────────────────────────────────────────
  // Transformar dados para Recharts
  // ──────────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return data.map((row) => ({
      month: labelMonth(row.month_key), // Ex: 'JAN/25'
      income: Math.round((row.total_income_cents ?? 0) / 100), // Converte para reais
      expense: Math.round((row.total_expense_cents ?? 0) / 100),
      net: Math.round((row.net_cents ?? 0) / 100),
      _raw: row, // Manter raw para debug
    }));
  }, [data]);

  // ──────────────────────────────────────────────────────────────────
  // Estados
  // ──────────────────────────────────────────────────────────────────
  if (isLoading) return <SkeletonChart />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div
      className="glass rounded-xl2 p-6 border border-white/10 h-[340px]"
      role="img"
      aria-label="Gráfico de fluxo mensal de receitas, despesas e líquido"
    >
      {/* ════════════════════════════════════════════════════════════════
          Header: Título + Ícone
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-nocry-text text-lg font-semibold">Fluxo por Mês</h3>
        <div className="h-10 w-10 rounded-lg bg-nocry-goldDark border border-white/10 grid place-items-center">
          <TrendingUp className="w-5 h-5 text-nocry-gold" />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Gráfico de Área (Recharts)
          ════════════════════════════════════════════════════════════════ */}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          {/* ────────────────────────────────────────────────────────────
              Gradientes: Receitas, Despesas, Líquido
              ──────────────────────────────────────────────────────────── */}
          <defs>
            <linearGradient id="goldIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="redExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="netLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9ad0f5" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#9ad0f5" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* Grid */}
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />

          {/* Eixo X: Meses (MMM/YY) */}
          <XAxis
            dataKey="month"
            tick={{ fill: '#CACACA', fontSize: 12 }}
            tickLine={{ stroke: '#CACACA' }}
          />

          {/* Eixo Y: Valores em reais */}
          <YAxis tick={{ fill: '#CACACA', fontSize: 12 }} />

          {/* Tooltip Customizado */}
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D4AF37', strokeWidth: 1 }} />

          {/* Legenda */}
          <Legend
            wrapperStyle={{ color: '#CACACA', fontSize: 12 }}
            formatter={(value: string) => {
              if (value === 'income') return 'Receitas';
              if (value === 'expense') return 'Despesas';
              if (value === 'net') return 'Líquido';
              return value;
            }}
          />

          {/* ────────────────────────────────────────────────────────────
              Áreas: Receitas, Despesas, Líquido
              ──────────────────────────────────────────────────────────── */}
          <Area
            type="monotone"
            dataKey="income"
            name="income"
            stroke="#D4AF37"
            fill="url(#goldIncome)"
            strokeWidth={2}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="expense"
            stroke="#ff6b6b"
            fill="url(#redExpense)"
            strokeWidth={2}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="net"
            name="net"
            stroke="#9ad0f5"
            fill="url(#netLine)"
            strokeWidth={2}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* ════════════════════════════════════════════════════════════════
          Rodapé: Info adicional
          ════════════════════════════════════════════════════════════════ */}
      <div className="mt-2 text-xs text-nocry-muted">
        Base: últimos {monthsBack} meses até hoje.
      </div>
    </div>
  );
}



