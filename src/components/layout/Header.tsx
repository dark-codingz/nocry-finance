"use client";

// ============================================================================
// Header - NoCry Finance (Sem Fundo)
// ============================================================================
// Propósito: Cabeçalho transparente com saudação e filtros de período.
//
// DESIGN (Fiel ao Mock):
// - Container do header: SEM fundo, SEM border, SEM shadow
// - Apenas os chips de data (De/Até) têm efeito glass
// - Fundo dourado do layout fica visível atrás
//
// LAYOUT:
// - Esquerda: Saudação "Bem vindo de volta {nome}" + subtítulo
// - Direita: Chips de data "De" e "Até" com glass
//
// ESTADO:
// - Nome do usuário (dinâmico via props)
// - Datas de filtro (state local, será conectado ao backend depois)
//
// PRÓXIMOS PASSOS:
// - Conectar filtros de data ao state global (context ou zustand)
// - Integrar com shadcn Date Picker para melhor UX
// ============================================================================

import { useState } from 'react';
import { Calendar } from 'lucide-react';

// ============================================================================
// Tipos
// ============================================================================

interface HeaderProps {
  userName?: string;
}

// ============================================================================
// Componente Principala
// ============================================================================

export default function Header({ userName = 'Membro' }: HeaderProps) {
  // Estado local para filtros de data (será movido para context depois)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      {/* ────────────────────────────────────────────────────────────────
          Esquerda: Saudação + Subtítulo
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <h1 className="text-white text-2xl md:text-3xl font-semibold mb-1">
          Bem vindo de volta, {userName}
        </h1>
        <p className="text-nocry-muted text-sm md:text-base">
          Gerencie Seu império Financeiro Aqui
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Direita: Filtros de Período (De/Até)
          ────────────────────────────────────────────────────────────────
          NOTA: Apenas os chips têm efeito glass.
          O container não tem fundo.
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* ──────────────────────────────────────────────────────────────
            Chip: De
            ────────────────────────────────────────────────────────────── */}
        <div className="glass rounded-xl px-4 py-2.5 border border-white/10 min-w-[140px]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-nocry-gold flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-nocry-muted text-[10px] uppercase tracking-wider">
                De
              </span>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-nocry-text text-sm outline-none w-full
                           [color-scheme:dark]
                           focus:outline-none"
                aria-label="Data inicial"
              />
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────
            Separador
            ────────────────────────────────────────────────────────────── */}
        <div className="text-nocry-text/60 text-sm">→</div>

        {/* ──────────────────────────────────────────────────────────────
            Chip: Até
            ────────────────────────────────────────────────────────────── */}
        <div className="glass rounded-xl px-4 py-2.5 border border-white/10 min-w-[140px]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-nocry-gold flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-nocry-muted text-[10px] uppercase tracking-wider">
                Até
              </span>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-nocry-text text-sm outline-none w-full
                           [color-scheme:dark]
                           focus:outline-none"
                aria-label="Data final"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
