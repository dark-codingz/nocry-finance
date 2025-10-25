// ============================================================================
// Store: walletSearch - Busca local da Carteira
// ============================================================================
// PROPÓSITO:
// - Gerencia o termo de busca da página /carteira
// - Estado global (compartilhado entre WalletActions e abas)
// - Zustand para performance e simplicidade
//
// USO:
// const { q, setQ } = useWalletSearch();
// <input value={q} onChange={(e) => setQ(e.target.value)} />
//
// FUTURO:
// - Adicionar debounce aqui se necessário
// - Adicionar filtros avançados (tipo, período, etc.)
// ============================================================================

'use client';
import { create } from 'zustand';

type WalletSearchState = {
  /** Termo de busca atual */
  q: string;
  /** Atualiza o termo de busca */
  setQ: (value: string) => void;
};

export const useWalletSearch = create<WalletSearchState>((set) => ({
  q: '',
  setQ: (value) => set({ q: value }),
}));



