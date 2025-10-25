// ============================================================================
// DateRangeBootstrapper - Hidrata Store da URL e Limpa
// ============================================================================
// PROPÓSITO:
// - Ler ?from e ?to da URL uma única vez (primeira montagem)
// - Hidratar store Zustand com os valores
// - Limpar parâmetros da URL (via history.replaceState)
// - Permite compartilhar links com filtros sem poluir a barra de endereço
//
// USO:
// Adicionar no topo do Dashboard (antes dos componentes de filtro):
// <DateRangeBootstrapper />
//
// EXEMPLO DE COMPARTILHAMENTO:
// https://app.com/?from=2025-10-01&to=2025-10-31
//   ↓ (hidrata store)
// https://app.com/ (URL limpa, filtro ativo)
// ============================================================================

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDateRange } from '@/stores/dateRange';

/**
 * Componente que hidrata o store de dateRange a partir dos parâmetros da URL
 * e remove os parâmetros após a hidratação.
 * 
 * **IMPORTANTE:** Este componente deve ser renderizado apenas uma vez,
 * de preferência no layout ou página principal do Dashboard.
 * 
 * @example
 * ```tsx
 * // src/app/(protected)/page.tsx
 * export default function DashboardPage() {
 *   return (
 *     <>
 *       <DateRangeBootstrapper />
 *       <DashboardHeader />
 *       <DashboardContent />
 *     </>
 *   );
 * }
 * ```
 */
export default function DateRangeBootstrapper() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { setRange } = useDateRange();

  useEffect(() => {
    const from = params.get('from');
    const to = params.get('to');

    // ─────────────────────────────────────────────────────────────────────
    // Se houver parâmetros na URL, hidratar o store
    // ─────────────────────────────────────────────────────────────────────
    if (from || to) {
      console.log('[DateRangeBootstrapper] Hidratando store da URL:', { from, to });
      setRange({ from, to });

      // ───────────────────────────────────────────────────────────────────
      // Limpar a URL sem recarregar a página
      // ───────────────────────────────────────────────────────────────────
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', pathname);
        console.log('[DateRangeBootstrapper] URL limpa:', pathname);
      }
    }

    // ⚠️ IMPORTANTE: Rodar apenas na primeira montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio = roda só uma vez

  // Componente invisível (não renderiza nada)
  return null;
}



