// ============================================================================
// BudgetCard - Card de Orçamento do Mês
// ============================================================================
// Propósito: Exibir orçamento definido com progresso visual.
//
// ORIGEM DOS DADOS:
// - Hook: useBudget({ month, from, to, userId })
// - Retorna: { totalCents, usedCents, remainingCents, percentUsed } ou null
//
// ESTADOS:
// - Sem orçamento: Mostra "Não definido" + link "Definir orçamento"
// - Com orçamento: Mostra progresso (barra) + "R$ X restante" + link "Editar"
//
// CÁLCULOS:
// - percentUsed: (usedCents / totalCents) * 100
// - remainingCents: totalCents - usedCents
//
// VISUAL:
// - Barra de progresso: altura 8px, bg-nocry-goldDark, fill bg-nocry-gold
// - Cores: Verde se < 70%, Amarelo se < 90%, Vermelho se >= 90%
//
// LINKS:
// - "Definir orçamento" → /carteira (ou modal)
// - "Editar" → /carteira (ou modal)
// ============================================================================

"use client";

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import KpiCard from './KpiCard';
import { formatBRL } from '@/lib/money';

// ============================================================================
// Tipos
// ============================================================================

interface BudgetCardProps {
  budget: {
    totalCents: number;
    usedCents: number;
    remainingCents: number;
    percentUsed: number;
  } | null;
  isLoading?: boolean;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function BudgetCard({ budget, isLoading }: BudgetCardProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <KpiCard label="Orçamento do Mês" value="..." icon={Wallet}>
        <div className="h-2 bg-nocry-goldDark/30 rounded-full animate-pulse" />
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Sem Orçamento Definido
  // ─────────────────────────────────────────────────────────────────────
  if (!budget) {
    return (
      <KpiCard label="Orçamento do Mês" value="Não definido" icon={Wallet}>
        <Link
          href="/carteira"
          className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors"
        >
          Definir orçamento →
        </Link>
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Com Orçamento Definido (com defaults seguros)
  // ─────────────────────────────────────────────────────────────────────
  const totalCents = typeof budget.totalCents === 'number' ? budget.totalCents : 0;
  const usedCents = typeof budget.usedCents === 'number' ? budget.usedCents : 0;
  const remainingCents = typeof budget.remainingCents === 'number' ? budget.remainingCents : 0;
  const percentUsed = typeof budget.percentUsed === 'number' ? budget.percentUsed : 0;

  // Determinar cor da barra (verde, amarelo, vermelho)
  const getProgressColor = () => {
    if (percentUsed < 70) return 'bg-green-500';
    if (percentUsed < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Formatação segura da porcentagem (sem toFixed, usa Math.round)
  const percentFormatted = Math.round(percentUsed);

  return (
    <KpiCard
      label="Orçamento do Mês"
      value={formatBRL(remainingCents)}
      icon={Wallet}
      iconHighlight={percentUsed < 90} // Destaque quando ainda há margem
    >
      {/* ──────────────────────────────────────────────────────────────
          Barra de Progresso
          ────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="h-2 bg-nocry-goldDark/30 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────
            Legenda: Usado / Total
            ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-nocry-muted">
            {formatBRL(usedCents)} de {formatBRL(totalCents)} ({percentFormatted}%)
          </span>
          <Link
            href="/carteira"
            className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>
    </KpiCard>
  );
}


