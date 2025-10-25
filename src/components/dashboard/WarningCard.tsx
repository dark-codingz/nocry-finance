"use client";

// ============================================================================
// WarningCard - Card de Avisos (Aviso!)
// ============================================================================
// Propósito: Exibir avisos sobre orçamento e faturas.
//
// REGRAS DE EXIBIÇÃO (prioridade decrescente):
// 1. Orçamento estourado (>= 100%): "Orçamento estourado neste período."
// 2. Orçamento alto (>= 80% && < 100%): "Orçamento acima de 80% usado."
// 3. Fatura próxima (<= 5 dias e > 0): "Fatura vence em {days} dias."
// 4. Nenhum aviso: "Tudo sob controle por enquanto."
//
// DESIGN:
// - Ícone AlertTriangle em quadrado
// - Fundo .glass
// - Altura ~180px
// - aria-live="polite" para acessibilidade
// - Cores: Vermelho para avisos críticos, amarelo para alertas, verde para OK
//
// EVOLUÇÃO FUTURA:
// - Adicionar notificações push para avisos críticos
// - Integrar com sistema de alertas automáticos
// - Permitir configurar thresholds (80%, 5 dias, etc.)
// - Adicionar botão "Resolver" que redireciona para ação (ex: pagar fatura)
// ============================================================================

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '@/lib/money';

// ============================================================================
// Tipos
// ============================================================================

interface WarningCardProps {
  warn: {
    high: boolean;   // >= 80% usado
    burst: boolean;  // >= 100% usado
  };
  invoice: {
    daysToDue: number;
    amountCents: number;
    cardName: string;
  } | null;
  isLoading?: boolean;
}

// ============================================================================
// Subcomponente: Skeleton
// ============================================================================

function SkeletonWarningCard() {
  return (
    <div className="glass rounded-xl2 p-5 border border-white/10 h-[180px]">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-24 bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-10 w-10 bg-nocry-goldDark/20 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-nocry-goldDark/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function WarningCard({
  warn,
  invoice,
  isLoading = false,
}: WarningCardProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) return <SkeletonWarningCard />;

  // ─────────────────────────────────────────────────────────────────────
  // Determinação do Estado (prioridade decrescente)
  // ─────────────────────────────────────────────────────────────────────
  let message = '';
  let severity: 'critical' | 'warning' | 'info' | 'ok' = 'ok';
  let Icon = CheckCircle2;
  let iconColor = 'bg-green-600';
  let iconTextColor = 'text-white';

  // Regra 1: Orçamento estourado (crítico)
  if (warn.burst) {
    message = 'Orçamento estourado neste período.';
    severity = 'critical';
    Icon = AlertTriangle;
    iconColor = 'bg-red-600';
    iconTextColor = 'text-white';
  }
  // Regra 2: Orçamento alto (aviso)
  else if (warn.high) {
    message = 'Orçamento acima de 80% usado.';
    severity = 'warning';
    Icon = AlertTriangle;
    iconColor = 'bg-yellow-600';
    iconTextColor = 'text-white';
  }
  // Regra 3: Fatura próxima (info)
  else if (invoice && invoice.daysToDue <= 5 && invoice.amountCents > 0) {
    const daysText = invoice.daysToDue === 0 ? 'hoje' : 
                      invoice.daysToDue === 1 ? 'amanhã' : 
                      `em ${invoice.daysToDue} dias`;
    message = `Fatura ${invoice.cardName} vence ${daysText} (${formatBRL(invoice.amountCents)}).`;
    severity = 'info';
    Icon = AlertTriangle;
    iconColor = 'bg-blue-600';
    iconTextColor = 'text-white';
  }
  // Regra 4: Tudo OK
  else {
    message = 'Tudo sob controle por enquanto.';
    severity = 'ok';
    Icon = CheckCircle2;
    iconColor = 'bg-green-600/80';
    iconTextColor = 'text-white';
  }

  // Cor do texto da mensagem baseada na severidade
  const messageColor =
    severity === 'critical' ? 'text-red-400' :
    severity === 'warning' ? 'text-yellow-400' :
    severity === 'info' ? 'text-blue-400' :
    'text-green-400';

  return (
    <div
      className="glass rounded-xl2 p-5 border border-white/10 h-[180px] flex flex-col"
      aria-live="polite"
      role="status"
      aria-label={`Aviso de saúde financeira: ${message}`}
    >
      {/* ────────────────────────────────────────────────────────────────
          Header: Título + Ícone
          ────────────────────────────────────────────────────────────────
          NOTA: Cor do ícone muda com base na severidade
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-nocry-text text-lg font-semibold">
          {severity === 'ok' ? 'Status' : 'Aviso!'}
        </h3>
        <div className={`h-10 w-10 rounded-lg ${iconColor} border border-white/10 grid place-items-center`}>
          <Icon className={`w-5 h-5 ${iconTextColor}`} />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Mensagem de Aviso
          ────────────────────────────────────────────────────────────────
          NOTA: Cor muda com base na severidade
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <p className={`${messageColor} text-sm leading-relaxed font-medium`}>
          {message}
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Badge de Severidade (visual extra)
          ────────────────────────────────────────────────────────────────
          NOTA: Exibe apenas se houver aviso/crítico
          ──────────────────────────────────────────────────────────────── */}
      {(severity === 'critical' || severity === 'warning') && (
        <div className="mt-3">
          <span
            className={`
              inline-block px-3 py-1 rounded-full text-xs font-semibold
              ${severity === 'critical' ? 'bg-red-600/20 text-red-400 border border-red-600/30' : ''}
              ${severity === 'warning' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' : ''}
            `}
          >
            {severity === 'critical' ? 'Crítico' : 'Atenção'}
          </span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          EVOLUÇÃO FUTURA:
          - Adicionar botão "Resolver" que redireciona para:
            - Orçamento estourado → /transacoes (revisar gastos)
            - Fatura próxima → /faturas (pagar fatura)
          - Adicionar link "Ver detalhes" que abre modal com informações
          - Adicionar opção "Silenciar por X dias" para avisos recorrentes
          ──────────────────────────────────────────────────────────────── */}
    </div>
  );
}


