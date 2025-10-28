// ============================================================================
// ShareLinkButton - Botão para Copiar Link com Filtros
// ============================================================================
// PROPÓSITO:
// - Gerar URL com parâmetros ?from e ?to do filtro atual
// - Copiar link para clipboard
// - Permite compartilhar Dashboard com filtros específicos
//
// USO:
// <ShareLinkButton />
//
// EXEMPLO DE LINK GERADO:
// https://app.com/?from=2025-10-01&to=2025-10-31
// ============================================================================

'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { useDateRange } from '@/stores/dateRange';
import { toast } from 'sonner';
import dayjs from 'dayjs';

/**
 * Botão para copiar link do Dashboard com filtros de data atuais.
 * 
 * Quando alguém abrir o link:
 * 1. DateRangeBootstrapper hidrata o store com ?from e ?to
 * 2. Filtros aparecem aplicados automaticamente
 * 3. URL é limpa (sem ?from e ?to visíveis)
 * 
 * @example
 * ```tsx
 * // No DashboardHeader:
 * <ShareLinkButton />
 * ```
 */
export default function ShareLinkButton() {
  const { from, to } = useDateRange();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      // Construir URL base
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = new URL('/', base);

      // Adicionar parâmetros de data (formatados como YYYY-MM-DD)
      if (from) {
        url.searchParams.set('from', dayjs(from).format('YYYY-MM-DD'));
      }
      if (to) {
        url.searchParams.set('to', dayjs(to).format('YYYY-MM-DD'));
      }

      // Copiar para clipboard
      await navigator.clipboard.writeText(url.toString());

      // Feedback visual
      setCopied(true);
      toast.success('Link copiado!', {
        description: 'Compartilhe este link para abrir o Dashboard com os filtros atuais.',
      });

      // Reset do ícone após 2 segundos
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[ShareLinkButton] Erro ao copiar:', error);
      toast.error('Erro ao copiar link', {
        description: 'Tente novamente ou copie manualmente da barra de endereço.',
      });
    }
  }

  return (
    <button
      onClick={copyLink}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[#CACACA] hover:text-white"
      title="Copiar link com filtros atuais"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-green-400">Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Compartilhar filtros</span>
        </>
      )}
    </button>
  );
}




