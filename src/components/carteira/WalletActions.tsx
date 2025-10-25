// ============================================================================
// WalletActions - Ações rápidas da Carteira
// ============================================================================
// PROPÓSITO:
// - Botões para lançar Receita, Despesa, Transferência, Contas Fixas
// - Campo de busca (sincronizado com store walletSearch)
// - Drawers placeholder para formulários (a serem implementados)
//
// FUTURO:
// - Plugar formulários reais com React Hook Form + Zod
// - Integrar com serviços (createIncome, createExpense, etc.)
// - Adicionar validação e feedback (toast)
// ============================================================================

'use client';
import { useState } from 'react';
import { useWalletSearch } from '@/stores/walletSearch';
import Drawer from '@/components/ui/Drawer';
import TxForm from './forms/TxForm';
import TransferForm from './forms/TransferForm';
import LaunchFixedMonth from './forms/LaunchFixedMonth';

type DrawerType = null | 'income' | 'expense' | 'transfer' | 'fixed';

export default function WalletActions() {
  const { q, setQ } = useWalletSearch();
  const [open, setOpen] = useState<DrawerType>(null);

  return (
    <div className="px-6 pb-4 flex flex-wrap items-center gap-3">
      {/* ────────────────────────────────────────────────────────────────
          Botões de Ação Rápida
          ──────────────────────────────────────────────────────────────── */}
      {[
        { k: 'income', label: '+Receita' },
        { k: 'expense', label: '+Despesa' },
        { k: 'transfer', label: '+Transferir' },
        { k: 'fixed', label: '+Lançar conta fixa' },
      ].map((btn) => (
        <button
          key={btn.k}
          onClick={() => setOpen(btn.k as DrawerType)}
          className="rounded-xl2 px-4 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          {btn.label}
        </button>
      ))}

      {/* ────────────────────────────────────────────────────────────────
          Campo de Busca
          ──────────────────────────────────────────────────────────────── */}
      <div className="ml-auto">
        <div className="rounded-xl2 px-4 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 focus-within:border-white/20 transition-all">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar"
            className="bg-transparent outline-none placeholder:text-[#9F9D9D] w-[200px]"
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Drawers de Formulários (Implementados)
          ════════════════════════════════════════════════════════════════
          FORMULÁRIOS:
          - TxForm: Receitas e Despesas (com RHF + Zod + CurrencyInputBRL)
          - TransferForm: Transferências entre contas
          - LaunchFixedMonth: Lançamento idempotente de contas fixas
          
          FEATURES:
          - Validação em tempo real (Zod)
          - Regra XOR: Conta OU Cartão (não ambos)
          - Toast de feedback (sonner)
          - Invalidação automática de queries (TanStack Query)
          - AutoFocus no primeiro campo
          ════════════════════════════════════════════════════════════════ */}

      {/* Drawer: Lançar Receita */}
      <Drawer open={open === 'income'} onClose={() => setOpen(null)} title="Lançar Receita">
        <TxForm kind="income" onSuccess={() => setOpen(null)} />
      </Drawer>

      {/* Drawer: Lançar Despesa */}
      <Drawer open={open === 'expense'} onClose={() => setOpen(null)} title="Lançar Despesa">
        <TxForm kind="expense" onSuccess={() => setOpen(null)} />
      </Drawer>

      {/* Drawer: Transferir entre contas */}
      <Drawer open={open === 'transfer'} onClose={() => setOpen(null)} title="Transferir entre contas">
        <TransferForm onSuccess={() => setOpen(null)} />
      </Drawer>

      {/* Drawer: Lançar fixas do mês */}
      <Drawer open={open === 'fixed'} onClose={() => setOpen(null)} title="Lançar fixas do mês">
        <LaunchFixedMonth onSuccess={() => setOpen(null)} />
      </Drawer>
    </div>
  );
}

