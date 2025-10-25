// src/components/digital/TopOffers.tsx
// ============================================================================
// Top 5 Ofertas por Desempenho
// ============================================================================
//
// ESTRUTURA:
// - Card "glass" com título
// - Tabela simples (responsiva)
// - Colunas: Oferta, Gasto, Receita, ROI, Vendas
// - Até 5 linhas (top 5)
//
// FORMATAÇÃO:
// - Valores monetários em BRL
// - ROI em formato "2.5x" ou "—" quando null
//
// CORES:
// - Gasto: text-red-400
// - Receita: text-green-400
// - ROI: verde >= 1.0, amarelo 0.8-1.0, vermelho < 0.8
//
// LOADING / ERRO:
// - Loading: skeleton de linhas
// - Erro: mensagem + botão retry
// ============================================================================

'use client';

import { useTopOffers } from '@/hooks/digital/useTopOffers';
import { formatBRL } from '@/lib/money';

interface TopOffersProps {
  userId: string | null;
  from: string;
  to: string;
}

export default function TopOffers({ userId, from, to }: TopOffersProps) {
  const { data, isLoading, isError, refetch } = useTopOffers({
    userId,
    from,
    to,
    limit: 5,
  });

  // ─────────────────────────────────────────────────────────────────────
  // Estado: Loading
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10">
        <h3 className="text-white text-lg font-semibold mb-4">TOP 5 OFERTAS</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-white/5 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Estado: Erro
  // ─────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10 text-center">
        <h3 className="text-white text-lg font-semibold mb-4">TOP 5 OFERTAS</h3>
        <p className="text-nocry-text mb-4">Falha ao carregar ranking de ofertas</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-nocry-gold text-nocry-bg rounded-lg hover:bg-nocry-gold/90 transition-colors"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Estado: Sem Dados
  // ─────────────────────────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10">
        <h3 className="text-white text-lg font-semibold mb-4">TOP 5 OFERTAS</h3>
        <p className="text-nocry-muted text-center py-8">
          Nenhuma oferta com dados no período selecionado.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Helper: Determinar cor do ROI
  // ─────────────────────────────────────────────────────────────────────
  const getRoiColor = (roi: number | null): string => {
    if (roi === null) return 'text-nocry-muted';
    if (roi >= 1.0) return 'text-green-400';
    if (roi >= 0.8) return 'text-yellow-300';
    return 'text-red-400';
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render: Tabela
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="glass rounded-xl p-6 border border-white/10">
      <h3 className="text-white text-lg font-semibold mb-4">TOP 5 OFERTAS</h3>

      {/* Tabela Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-nocry-muted text-sm border-b border-white/10">
              <th className="pb-3 font-medium">Oferta</th>
              <th className="pb-3 font-medium text-right">Gasto</th>
              <th className="pb-3 font-medium text-right">Receita</th>
              <th className="pb-3 font-medium text-right">ROI</th>
              <th className="pb-3 font-medium text-right">Vendas</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {data.map((offer, index) => {
              const roiText = offer.roi !== null ? `${offer.roi.toFixed(1)}x` : '—';
              const roiColor = getRoiColor(offer.roi);

              return (
                <tr
                  key={offer.offerId}
                  className="border-b border-white/5 last:border-0"
                >
                  {/* Nome da Oferta */}
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-nocry-gold font-semibold">
                        #{index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[200px]">
                        {offer.offerName}
                      </span>
                    </div>
                  </td>

                  {/* Gasto */}
                  <td className="py-3 text-right text-red-400 text-sm">
                    {formatBRL(offer.spendCents)}
                  </td>

                  {/* Receita */}
                  <td className="py-3 text-right text-green-400 text-sm font-medium">
                    {formatBRL(offer.revenueCents)}
                  </td>

                  {/* ROI */}
                  <td className={`py-3 text-right text-sm font-semibold ${roiColor}`}>
                    {roiText}
                  </td>

                  {/* Vendas */}
                  <td className="py-3 text-right text-nocry-muted text-sm">
                    {offer.salesCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé com nota explicativa */}
      <p className="text-nocry-muted text-xs mt-4 pt-4 border-t border-white/10">
        * Ranking baseado em Lucro (Receita − Gasto) no período selecionado
      </p>
    </div>
  );
}



