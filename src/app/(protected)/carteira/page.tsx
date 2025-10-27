"use client";

import DevWarning from '@/components/ui/DevWarning';

/**
 * Página: Carteira
 * 
 * Status: Em desenvolvimento
 * 
 * Funcionalidades planejadas:
 * - Visão geral de contas bancárias
 * - Transações recentes
 * - Transferências entre contas
 * - Saldo consolidado
 */
export default function CarteiraPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Carteira</h1>
      <DevWarning />
    </div>
  );
}

