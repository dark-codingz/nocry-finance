"use client";

// ============================================================================
// AppShell - NoCry Finance
// ============================================================================
// Propósito: Layout principal que compõe Sidebar + Header + Conteúdo.
//
// ESTRUTURA:
// - Sidebar fixa à esquerda (colapsada: 72px, expandida: 264px)
// - Main com padding-left dinâmico que acompanha a sidebar
// - Header sticky com efeito glass
// - Conteúdo principal (children) renderizado em <section>
//
// RESPONSIVIDADE:
// - Desktop: Sidebar fixa + main com pl-[72px]
// - Tablet/Mobile: Simplificado (sidebar pode virar drawer depois)
//
// ANIMAÇÃO:
// - Padding do main se ajusta automaticamente quando sidebar expande
// - Transição suave de 300ms
//
// PRÓXIMOS PASSOS:
// - Adicionar drawer mobile para sidebar
// - Conectar userName do Header ao session context
// ============================================================================

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

// ============================================================================
// Tipos
// ============================================================================

interface AppShellProps {
  children: ReactNode;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen"
    style={{
      background: `
      radial-gradient(900px 560px at 78% 18%, #f1d27a 0%, transparent 62%),
      radial-gradient(1100px 680px at 55% 82%, #d4af37 0%, transparent 68%),
      radial-gradient(1200px 700px at 18% 0%, #7a5a10 0%, transparent 64%),
      radial-gradient(1200px 720px at 50% 105%, #2c240f 0%, transparent 75%),
      #000000
      `
  }}
    >
      {/* ════════════════════════════════════════════════════════════════
          Fundo Dourado com Gradientes Radiais (fixo ao viewport)
          ════════════════════════════════════════════════════════════════
          NOTA: Fundo FIXED (não absolute) para cobrir sempre o viewport,
          mesmo com scroll infinito. Com -z-10 e pointer-events-none.
          4 gradientes radiais posicionados estrategicamente.
          ════════════════════════════════════════════════════════════════ */}
       
        <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
            background: `
            radial-gradient(900px 560px at 78% 18%, #f1d27a 0%, transparent 62%),
            radial-gradient(1100px 680px at 55% 82%, #d4af37 0%, transparent 68%),
            radial-gradient(1200px 700px at 18% 0%, #7a5a10 0%, transparent 64%),
            radial-gradient(1200px 720px at 50% 105%, #2c240f 0%, transparent 75%),
            #000000
            `
        }}
        />

        {/* Vinheta (fixa ao viewport, escurecimento nas bordas) */}
        <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
            background:
            'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.58))'
        }}
        />


      {/* ────────────────────────────────────────────────────────────────
          Sidebar (fixa à esquerda)
          ──────────────────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ────────────────────────────────────────────────────────────────
          Main Content Area (SEM FUNDO OPACO)
          ────────────────────────────────────────────────────────────────
          NOTA: Main, Header e Section não têm background.
          O fundo dourado fica visível por trás de tudo.
          Apenas os cards individuais usam .glass
          ──────────────────────────────────────────────────────────────── */}
      <main className="relative min-h-screen pl-[72px] transition-all duration-300">
        {/* Conteúdo Principal - Cada página controla seu próprio header */}
        {children}
      </main>
    </div>
  );
}

