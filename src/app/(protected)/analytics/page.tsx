// ============================================================================
// Página: Analytics
// ============================================================================
// PROPÓSITO:
// - Página de análises avançadas (em desenvolvimento)
// - Restrita a usuários da whitelist de administradores
//
// STATUS: 🚧 Em Desenvolvimento
// ============================================================================

'use client';

import DevWarning from '@/components/ui/DevWarning';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function AnalyticsPage() {
  const { isAdmin, isLoading } = useIsAdmin();

  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[#CACACA]">Carregando...</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Guard: Apenas admins podem acessar (página em desenvolvimento)
  // ─────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return <DevWarning />;
  }

  // ─────────────────────────────────────────────────────────────────────
  // TODO: Implementar conteúdo de Analytics
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 pt-5 pb-10">
      <h1 className="text-white text-2xl md:text-3xl font-semibold mb-2">
        Analytics
      </h1>
      <p className="text-[#9F9D9D] text-sm mb-6">
        Análises avançadas e métricas de desempenho
      </p>

      {/* Placeholder para conteúdo futuro */}
      <div className="glass rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-[#CACACA]">
          🚧 Conteúdo em desenvolvimento...
        </p>
      </div>
    </div>
  );
}



