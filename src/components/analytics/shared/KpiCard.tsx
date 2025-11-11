// ============================================================================
// components/analytics/shared/KpiCard.tsx - Card Genérico para KPIs
// ============================================================================

'use client';

import { formatBRL } from '@/lib/money';
import { getBadgeColor } from '@/lib/analytics/thresholds';
import type { BadgeType } from '@/lib/analytics/thresholds';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type KpiCardProps = {
  label: string;
  value: string | number;
  icon?: string; // Emoji
  badge?: BadgeType;
  mom?: number; // Variação MoM (%)
  subtitle?: string;
  onClick?: () => void;
  isLoading?: boolean;
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ────────────────────────────────────────────────────────────────────────────

export default function KpiCard({
  label,
  value,
  icon,
  badge = 'neutral',
  mom,
  subtitle,
  onClick,
  isLoading = false,
}: KpiCardProps) {
  const badgeColor = getBadgeColor(badge);
  const isMomPositive = mom !== undefined && mom > 0;
  const isMomNegative = mom !== undefined && mom < 0;

  return (
    <div
      className={`glass rounded-2xl border border-white/10 p-6 transition-all ${
        onClick ? 'cursor-pointer hover:border-white/20 hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      {/* Header: Label + Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <span className="text-sm text-[#9F9D9D]">{label}</span>
        </div>

        {badge !== 'neutral' && (
          <div
            className={`px-2 py-1 rounded-lg text-xs font-medium border ${badgeColor}`}
          >
            {badge === 'success' && '✅'}
            {badge === 'warning' && '⚠️'}
            {badge === 'danger' && '🔴'}
          </div>
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="h-10 w-32 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className="text-3xl font-semibold text-white mb-2">
          {value}
        </div>
      )}

      {/* Footer: MoM + Subtitle */}
      <div className="flex items-center justify-between">
        {mom !== undefined && !isLoading && (
          <div
            className={`text-sm font-medium ${
              isMomPositive
                ? 'text-green-400'
                : isMomNegative
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {isMomPositive && '↑ '}
            {isMomNegative && '↓ '}
            {Math.abs(mom).toFixed(1)}% MoM
          </div>
        )}

        {subtitle && (
          <span className="text-xs text-[#9F9D9D]">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

