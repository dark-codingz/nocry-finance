// ============================================================================
// WalletTabs - Sistema de abas da Carteira
// ============================================================================
// PROPÓSITO:
// - Controla qual aba está ativa (Geral, Categorias, Transações, etc.)
// - Renderiza o conteúdo correspondente à aba selecionada
// - Usa TabsPills para navegação visual
//
// ABAS:
// - Geral: Visão geral (últimas transações, contas, cartões)
// - Categorias: CRUD de categorias
// - Transações: Lista completa com filtros avançados
// - Contas: CRUD de contas financeiras
// - Contas Fixas: CRUD de contas recorrentes
// - Cartões: CRUD de cartões de crédito
// ============================================================================

'use client';
import { useState } from 'react';
import { TabsPills } from '@/components/ui/TabsPills';
import WalletGeneral from './tabs/WalletGeneral';
import WalletCategories from './tabs/WalletCategories';
import WalletTransactions from './tabs/WalletTransactions';
import WalletAccounts from './tabs/WalletAccounts';
import WalletFixed from './tabs/WalletFixed';
import WalletCardsTab from './tabs/WalletCardsTab';

const TAB_ITEMS = [
  { key: 'geral', label: 'Geral' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'transacoes', label: 'Transações' },
  { key: 'contas', label: 'Contas' },
  { key: 'contas-fixas', label: 'Contas Fixas' },
  { key: 'cartoes', label: 'Cartões' },
];

export default function WalletTabs() {
  const [tab, setTab] = useState<string>('geral');

  return (
    <div className="px-6">
      {/* ────────────────────────────────────────────────────────────────
          Pills de Navegação
          ──────────────────────────────────────────────────────────────── */}
      <TabsPills items={TAB_ITEMS} value={tab} onChange={setTab} className="mb-4" />

      {/* ────────────────────────────────────────────────────────────────
          Conteúdo da Aba Selecionada
          ──────────────────────────────────────────────────────────────── */}
      {tab === 'geral' && <WalletGeneral />}
      {tab === 'categorias' && <WalletCategories />}
      {tab === 'transacoes' && <WalletTransactions />}
      {tab === 'contas' && <WalletAccounts />}
      {tab === 'contas-fixas' && <WalletFixed />}
      {tab === 'cartoes' && <WalletCardsTab />}
    </div>
  );
}

