"use client";

// ============================================================================
// CheerCard - Card de Incentivo (Parabéns!)
// ============================================================================
// Propósito: Exibir mensagem de incentivo baseada no uso do orçamento.
//
// REGRAS DE EXIBIÇÃO:
// 1. Se não há orçamento: Ocultar card
// 2. Se pctAtingido < 50%: "Continue no ritmo! Você está abaixo de 50% do orçamento."
// 3. Se pctAtingido >= 50% && < 100%: "Falta apenas {faltaPct}% para bater sua meta!"
// 4. Se pctAtingido >= 100%: Ocultar card (meta ultrapassada)
//
// DESIGN:
// - Ícone CheckSquare em quadrado dourado (ativo)
// - Fundo .glass
// - Altura ~180px
// - aria-live="polite" para acessibilidade
//
// EVOLUÇÃO FUTURA:
// - Adicionar animação de "conquista desbloqueada" ao atingir 100%
// - Integrar com sistema de badges/recompensas
// - Permitir customizar mensagens
// ============================================================================

import React from 'react';
import { CheckSquare } from 'lucide-react';

// ============================================================================
// Tipos
// ============================================================================

interface CheerCardProps {
  hasBudget: boolean;
  pctAtingido: number; // 0-1
  faltaPct: number;    // 0-100 (inteiro)
  isLoading?: boolean;
}

// ============================================================================
// Subcomponente: Skeleton
// ============================================================================

function SkeletonCheerCard() {
  return (
    <div className="glass rounded-xl2 p-5 border border-white/10 h-[180px]">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-32 bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-10 w-10 bg-nocry-goldDark/20 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-nocry-goldDark/20 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-nocry-goldDark/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function CheerCard({
  hasBudget,
  pctAtingido,
  faltaPct,
  isLoading = false,
}: CheerCardProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) return <SkeletonCheerCard />;

  // ─────────────────────────────────────────────────────────────────────
  // Regra 1: Sem orçamento → Ocultar
  // ─────────────────────────────────────────────────────────────────────
  if (!hasBudget) return null;

  // ─────────────────────────────────────────────────────────────────────
  // Regra 4: Orçamento estourado → Ocultar (não há mais meta para bater)
  // ─────────────────────────────────────────────────────────────────────
  if (pctAtingido >= 1) return null;

  // ─────────────────────────────────────────────────────────────────────
  // Regra 2 e 3: Definir mensagem com base no percentual
  // ─────────────────────────────────────────────────────────────────────
  const message =
    pctAtingido < 0.5
      ? 'Continue no ritmo! Você está abaixo de 50% do orçamento.'
      : `Falta apenas ${faltaPct}% para bater sua meta!`;

  return (
    <div
      className="glass rounded-xl2 p-5 border border-white/10 h-[180px] flex flex-col"
      aria-live="polite"
      role="status"
    >
      {/* ────────────────────────────────────────────────────────────────
          Header: Título + Ícone
          ────────────────────────────────────────────────────────────────
          NOTA: Ícone em quadrado dourado (estado "ativo")
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-nocry-text text-lg font-semibold">Parabéns!</h3>
        <div className="h-10 w-10 rounded-lg bg-nocry-gold border border-white/10 grid place-items-center">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Mensagem de Incentivo
          ────────────────────────────────────────────────────────────────
          NOTA: Texto principal em nocry-text, números destacados em white
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <p className="text-nocry-text text-sm leading-relaxed">
          {message}
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Barra de Progresso Visual (opcional)
          ────────────────────────────────────────────────────────────────
          NOTA: Mostra visualmente o percentual atingido
          ──────────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-nocry-muted text-xs">Progresso</span>
          <span className="text-white text-xs font-semibold">
            {Math.round(pctAtingido * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-nocry-goldDark/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-nocry-gold to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pctAtingido * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}


