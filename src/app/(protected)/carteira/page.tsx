// ============================================================================
// Página: /carteira
// ============================================================================
// PROPÓSITO:
// - Central de configurações e lançamentos financeiros
// - Header local (não fixo) com título + botão "Definir Orçamento"
// - Ações rápidas: botões de lançamento + busca
// - Sistema de abas: Geral, Categorias, Transações, Contas, Contas Fixas, Cartões
//
// ARQUITETURA:
// - Client Component (usa hooks e estado)
// - Componentes modulares (WalletHeader, WalletActions, WalletTabs)
// - Store Zustand para busca (walletSearch)
// - Store useDateRange para filtros de período (usado em Transações)
//
// ESTILO:
// - Tema dourado NoCry Group (#D4AF37)
// - Cards com efeito glass (glassmorphism)
// - Background fixo (gradiente dourado do AppShell)
// ============================================================================

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import WalletHeader from '@/components/carteira/WalletHeader';
import WalletActions from '@/components/carteira/WalletActions';
import WalletTabs from '@/components/carteira/WalletTabs';
import Drawer from '@/components/ui/Drawer';
import BudgetForm from '@/components/budget/BudgetForm';

export default function CarteiraPage() {
  const [openBudget, setOpenBudget] = useState(false);
  const qc = useQueryClient();

  // ──────────────────────────────────────────────────────────────────
  // Helper: Refetch após salvar orçamento
  // ──────────────────────────────────────────────────────────────────
  function handleBudgetSaved() {
    setOpenBudget(false);

    // Invalidar queries relevantes (Dashboard + Carteira)
    qc.invalidateQueries({ queryKey: ['budget'] });
    qc.invalidateQueries({ queryKey: ['pf-month-summary'] });
    qc.invalidateQueries({ queryKey: ['pf-fixed-remaining'] });
    qc.invalidateQueries({ queryKey: ['pf-card-invoices-current-total'] });
    qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
    qc.invalidateQueries({ queryKey: ['wallet-accounts'] });
    qc.invalidateQueries({ queryKey: ['wallet-cards'] });
  }

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          Header: Título + Subtítulo + Botão "Definir Orçamento"
          ════════════════════════════════════════════════════════════════
          NOTA: Header estático (rola com a página).
          Diferente do Dashboard que tem DashboardHeader fixo.
          ════════════════════════════════════════════════════════════════ */}
      <WalletHeader onOpenBudget={() => setOpenBudget(true)} />

      {/* ════════════════════════════════════════════════════════════════
          Ações Rápidas: Botões + Busca
          ════════════════════════════════════════════════════════════════
          NOTA: Botões abrem drawers com formulários (placeholder).
          Busca sincroniza com store walletSearch.
          ════════════════════════════════════════════════════════════════ */}
      <WalletActions />

      {/* ════════════════════════════════════════════════════════════════
          Sistema de Abas: Geral, Categorias, Transações, etc.
          ════════════════════════════════════════════════════════════════
          NOTA: Cada aba renderiza seu próprio conteúdo.
          Placeholder com EmptyState (conectar com hooks reais depois).
          ════════════════════════════════════════════════════════════════ */}
      <WalletTabs />

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Definir Orçamento
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={openBudget}
        onClose={() => setOpenBudget(false)}
        title="Definir Orçamento do Mês"
      >
        <BudgetForm onSaved={handleBudgetSaved} />
      </Drawer>
    </>
  );
}


