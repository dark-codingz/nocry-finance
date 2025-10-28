// ============================================================================
// NextBillCard - Card de Próxima Conta Fixa
// ============================================================================
// Propósito: Exibir a próxima conta fixa a vencer.
//
// ORIGEM DOS DADOS:
// - Hook: useNextFixedBill({ userId })
// - Tabela: fixed_bills (name, amount_cents, day_of_month)
//
// RETORNO:
// - { name, amountCents, dueDay, daysUntilDue } ou null
//
// ESTADOS:
// - Sem contas fixas: "Nenhuma conta cadastrada"
// - Com conta próxima: Valor + "Vencimento Dia X" + link "Ver fixas"
//
// LINKS:
// - "Ver fixas" → /fixas
// ============================================================================

"use client";

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import KpiCard from './KpiCard';
import { formatBRL } from '@/lib/money';

// ============================================================================
// Tipos
// ============================================================================

interface NextBillCardProps {
  bill: {
    name: string;
    amountCents: number;
    dueDay: number;
    daysUntilDue: number;
  } | null;
  isLoading?: boolean;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function NextBillCard({ bill, isLoading }: NextBillCardProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <KpiCard label="Próxima Conta" value="..." icon={Calendar}>
        <div className="h-4 w-32 bg-nocry-goldDark/30 rounded animate-pulse" />
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Sem Contas Fixas Cadastradas
  // ─────────────────────────────────────────────────────────────────────
  if (!bill) {
    return (
      <KpiCard label="Próxima Conta" value="N/A" icon={Calendar}>
        <div className="flex items-center justify-between">
          <span className="text-nocry-muted text-xs">Nenhuma conta cadastrada</span>
          <Link
            href="/carteira"
            className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors text-xs"
          >
            Ver fixas →
          </Link>
        </div>
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Com Próxima Conta
  // ─────────────────────────────────────────────────────────────────────
  const { name, amountCents, dueDay, daysUntilDue } = bill;

  // Formatar texto de vencimento
  const getDueText = () => {
    if (daysUntilDue === 0) return 'Vence hoje';
    if (daysUntilDue === 1) return 'Vence amanhã';
    if (daysUntilDue < 0) return `Vencida há ${Math.abs(daysUntilDue)} dias`;
    return `Vence em ${daysUntilDue} dias`;
  };

  const dueText = getDueText();

  // Destaque se estiver próximo do vencimento (< 7 dias)
  const isUrgent = daysUntilDue >= 0 && daysUntilDue < 7;

  return (
    <KpiCard
      label="Próxima Conta"
      value={formatBRL(amountCents)}
      icon={Calendar}
      iconHighlight={isUrgent} // Destaque se próximo do vencimento
    >
      <div className="space-y-1">
        {/* Nome da conta */}
        <div className="text-xs text-nocry-muted truncate" title={name}>
          {name}
        </div>

        {/* Vencimento + Link */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isUrgent ? 'text-yellow-500' : 'text-nocry-muted'}`}>
            {dueText} • Dia {dueDay}
          </span>
          <Link
            href="/fixas"
            className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors text-xs"
          >
            Ver fixas →
          </Link>
        </div>
      </div>
    </KpiCard>
  );
}





