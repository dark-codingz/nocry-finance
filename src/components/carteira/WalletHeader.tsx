// ============================================================================
// WalletHeader - Cabeçalho da página Carteira
// ============================================================================
// PROPÓSITO:
// - Header estático (não fixo, rola com a página)
// - Título principal e subtítulo
// - Ações: Botão "Definir Orçamento" no canto superior direito
//
// NOTA: Diferente do DashboardHeader, este não tem filtros De/Até.
// Cada aba decide se precisa de filtros específicos.
// ============================================================================

'use client';

import { Settings } from 'lucide-react';

interface WalletHeaderProps {
  onOpenBudget?: () => void;
}

export default function WalletHeader({ onOpenBudget }: WalletHeaderProps) {
  return (
    <div className="px-6 pt-5 pb-3">
      <div className="flex items-start justify-between gap-4">
        {/* Título */}
        <div>
          <h1 className="text-white text-2xl md:text-3xl font-semibold">
            Carteira
          </h1>
          <p className="text-[13px] md:text-sm text-[#9F9D9D]">
            Configurações e Lançamentos
          </p>
        </div>

        {/* Botão Definir Orçamento */}
        {onOpenBudget && (
          <button
            onClick={onOpenBudget}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90 transition-opacity font-medium whitespace-nowrap"
          >
            <Settings className="h-4 w-4" />
            Definir Orçamento
          </button>
        )}
      </div>
    </div>
  );
}

