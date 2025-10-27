"use client";

import DevWarning from '@/components/ui/DevWarning';

/**
 * Página: Empréstimos
 * 
 * Status: Em desenvolvimento
 * 
 * Funcionalidades planejadas:
 * - Lista de empréstimos ativos
 * - Histórico de pagamentos
 * - Cálculo de juros
 * - Adicionar novos empréstimos
 * - Gerenciar empréstimos (adicionar principal, pagar, adicionar juros)
 */
export default function EmprestimosPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Empréstimos</h1>
      <DevWarning />
    </div>
  );
}
