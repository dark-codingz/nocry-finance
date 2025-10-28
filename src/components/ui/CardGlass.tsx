// ============================================================================
// CardGlass - Card com efeito vidro (glassmorphism)
// ============================================================================
// PROPÓSITO:
// - Card reutilizável com efeito glass para uso em qualquer página
// - Background translúcido com blur, borda sutil e sombra
// - Header opcional com título e ações à direita
//
// USO:
// <CardGlass title="Minhas Contas" actions={<button>+</button>}>
//   <p>Conteúdo do card...</p>
// </CardGlass>
// ============================================================================

'use client';
import clsx from 'clsx';
import * as React from 'react';

type CardGlassProps = {
  className?: string;
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
};

export default function CardGlass({
  className,
  children,
  title,
  actions,
}: CardGlassProps) {
  return (
    <div
      className={clsx(
        // Efeito glass: fundo translúcido com blur
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md',
        // Sombra escura para profundidade
        'shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
        // Texto padrão
        'text-[#CACACA]',
        className
      )}
    >
      {/* Header (opcional) */}
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          {title && <h3 className="text-sm font-medium text-white">{title}</h3>}
          {actions}
        </div>
      )}

      {/* Conteúdo */}
      <div className={clsx(title || actions ? 'px-4 pb-4' : 'p-4')}>
        {children}
      </div>
    </div>
  );
}




