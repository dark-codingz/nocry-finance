// ============================================================================
// InvoiceCard - Card de Fatura Atual
// ============================================================================
// Propósito: Exibir valor total das faturas em aberto (ciclo atual).
//
// ORIGEM DOS DADOS:
// - Hook: useCurrentInvoices({ userId })
// - View: card_invoices_current (soma de todos os cartões)
//
// RETORNO:
// - { amountCents, dueDate, daysToDue }
//
// ESTADOS:
// - Sem faturas: "Nenhuma fatura em aberto"
// - Com faturas: Valor + "Vence em X dias" + link "Ver faturas"
//
// LINKS:
// - "Ver faturas" → /faturas
// ============================================================================

"use client";

import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import KpiCard from './KpiCard';
import { formatBRL } from '@/lib/money';

// ============================================================================
// Tipos
// ============================================================================

interface InvoiceCardProps {
  invoice: {
    amountCents: number;
    dueDate: string | null;
    daysToDue: number | null;
  } | null;
  isLoading?: boolean;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function InvoiceCard({ invoice, isLoading }: InvoiceCardProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <KpiCard label="Fatura Atual" value="..." icon={CreditCard}>
        <div className="h-4 w-32 bg-nocry-goldDark/30 rounded animate-pulse" />
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Sem Faturas em Aberto
  // ─────────────────────────────────────────────────────────────────────
  if (!invoice || invoice.amountCents === 0) {
    return (
      <KpiCard label="Fatura Atual" value={formatBRL(0)} icon={CreditCard}>
        <div className="flex items-center justify-between">
          <span className="text-nocry-muted text-xs">Nenhuma fatura em aberto</span>
          <Link
            href="/carteira"
            className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors text-xs"
          >
            Ver faturas →
          </Link>
        </div>
      </KpiCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Com Faturas em Aberto
  // ─────────────────────────────────────────────────────────────────────
  const { amountCents, daysToDue } = invoice;

  // Formatar texto de vencimento
  const getDueText = () => {
    if (daysToDue === null) return null;
    if (daysToDue === 0) return 'Vence hoje';
    if (daysToDue === 1) return 'Vence amanhã';
    if (daysToDue < 0) return `Vencida há ${Math.abs(daysToDue)} dias`;
    return `Vence em ${daysToDue} dias`;
  };

  const dueText = getDueText();

  // Destaque se estiver próximo do vencimento (< 7 dias)
  const isUrgent = daysToDue !== null && daysToDue >= 0 && daysToDue < 7;

  return (
    <KpiCard
      label="Fatura Atual"
      value={formatBRL(amountCents)}
      icon={CreditCard}
      iconHighlight={isUrgent} // Destaque se próximo do vencimento
    >
      <div className="flex items-center justify-between">
        {dueText && (
          <span className={`text-xs ${isUrgent ? 'text-yellow-500' : 'text-nocry-muted'}`}>
            {dueText}
          </span>
        )}
        <Link
          href="/faturas"
          className="text-nocry-text hover:text-white underline-offset-4 hover:underline transition-colors text-xs ml-auto"
        >
          Ver faturas →
        </Link>
      </div>
    </KpiCard>
  );
}




