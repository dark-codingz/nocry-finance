// ============================================================================
// EmptyState - Estado vazio amigável
// ============================================================================
// PROPÓSITO:
// - Mensagem quando não há dados para exibir
// - Título, subtítulo opcional e ação (botão) opcional
// - Melhora UX evitando telas em branco
//
// USO:
// <EmptyState
//   title="Nenhuma transação"
//   subtitle="Quando você lançar algo, aparecerá aqui."
//   action={<button>Criar primeira transação</button>}
// />
// ============================================================================

import * as React from 'react';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 text-[#CACACA]">
      {/* Título principal */}
      <div className="text-white font-medium text-base">{title}</div>

      {/* Subtítulo (opcional) */}
      {subtitle && <div className="text-sm opacity-80 mt-1">{subtitle}</div>}

      {/* Ação (botão/link, opcional) */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}




