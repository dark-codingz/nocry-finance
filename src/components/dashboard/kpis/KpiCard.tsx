// ============================================================================
// KpiCard - Card Genérico de KPI
// ============================================================================
// Propósito: Componente reutilizável para exibir métricas com visual glass.
//
// DESIGN (Fiel ao Mock):
// - Background: glass (translúcido + blur)
// - Label: text-[13px] text-nocry-muted
// - Valor: text-2xl md:text-3xl font-semibold text-white
// - Ícone: Quadradinho 40x40px com border, à direita (opcional)
//
// ESTADOS DO ÍCONE:
// - Destaque: bg-nocry-gold + text-white
// - Padrão: bg-nocry-goldDark + text-nocry-text
//
// PROPS:
// - label: Texto pequeno acima do valor
// - value: Valor principal (formatado como string)
// - icon: Componente Lucide (opcional)
// - iconHighlight: Boolean para estado de destaque
// - children: Conteúdo extra abaixo do valor (links, progressos, etc.)
//
// USO:
// <KpiCard
//   label="SDM"
//   value="R$ 12.345,67"
//   icon={TrendingUp}
//   iconHighlight={true}
// />
// ============================================================================

import { type LucideIcon } from 'lucide-react';

// ============================================================================
// Tipos
// ============================================================================

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconHighlight?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function KpiCard({
  label,
  value,
  icon: Icon,
  iconHighlight = false,
  children,
  className = '',
}: KpiCardProps) {
  return (
    <div className={`glass rounded-xl p-5 border border-white/10 ${className}`}>
      {/* ────────────────────────────────────────────────────────────────
          Header: Label + Ícone
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        {/* Label */}
        <span className="text-[13px] text-nocry-muted uppercase tracking-wider">
          {label}
        </span>

        {/* Ícone (opcional) */}
        {Icon && (
          <div
            className={`
              h-10 w-10 rounded-lg grid place-items-center border border-white/10 transition-colors
              ${
                iconHighlight
                  ? 'bg-nocry-gold text-white'
                  : 'bg-nocry-goldDark text-nocry-text'
              }
            `}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Valor Principal
          ──────────────────────────────────────────────────────────────── */}
      <div className="text-2xl md:text-3xl font-semibold text-white mb-2">
        {value}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Conteúdo Extra (links, sub-valores, etc.)
          ──────────────────────────────────────────────────────────────── */}
      {children && (
        <div className="mt-3 text-sm">
          {children}
        </div>
      )}
    </div>
  );
}


