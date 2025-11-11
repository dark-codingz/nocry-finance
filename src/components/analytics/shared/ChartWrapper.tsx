// ============================================================================
// components/analytics/shared/ChartWrapper.tsx - Wrapper para Gráficos
// ============================================================================

'use client';

import { ReactNode } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type ChartWrapperProps = {
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: Error | null;
  children: ReactNode;
  actions?: ReactNode;
  height?: number | string;
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ────────────────────────────────────────────────────────────────────────────

export default function ChartWrapper({
  title,
  subtitle,
  isLoading = false,
  error,
  children,
  actions,
  height = 400,
}: ChartWrapperProps) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-[#9F9D9D] mt-1">{subtitle}</p>
            )}
          </div>

          {actions && <div>{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorFallback error={error} />}
        {!isLoading && !error && children}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full h-full bg-white/5 rounded animate-pulse" />
      <span className="text-sm text-[#9F9D9D] mt-4">Carregando...</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ERROR FALLBACK
// ────────────────────────────────────────────────────────────────────────────

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-4xl mb-4">⚠️</span>
      <span className="text-sm text-red-400 mb-2">Erro ao carregar dados</span>
      <span className="text-xs text-[#9F9D9D]">{error.message}</span>
    </div>
  );
}

