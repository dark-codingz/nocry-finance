// src/stores/dateRange.ts
// ============================================================================
// Store Zustand para Gerenciamento de Período (De/Até) com Persist
// ============================================================================
//
// PROPÓSITO:
// - Armazenar período selecionado (from/to) com persistência em localStorage
// - Filtro funcional SEM parâmetros visíveis na URL
// - Hidratar da URL uma única vez (para compartilhamento de links)
//
// USO:
// const { from, to, setRange } = useDateRange();
//
// SINCRONIZAÇÃO:
// - DateRangeBootstrapper hidrata da URL (primeira montagem) e limpa URL
// - DashboardHeader atualiza apenas o store (não toca na URL)
// - Hooks de dados (useFinanceKpis, etc.) leem do store
//
// PERSISTÊNCIA:
// - LocalStorage: 'nocry:dateRange'
// - Sobrevive a reloads e navegação
//
// DEFAULT:
// - Mês atual (startOfMonth → endOfMonth)
//
// FUTURO:
// - Presets (Hoje, Esta Semana, Este Mês, Últimos 30 dias)
// - Histórico de períodos selecionados
// - Comparação entre períodos
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, endOfMonth, formatISO, startOfMonth } from 'date-fns';

// ============================================================================
// Tipos
// ============================================================================

type Range = { from: string | null; to: string | null };

// ============================================================================
// Helper: Período Padrão (mês atual)
// ============================================================================

function getDefaultRange(): Range {
  const now = new Date();
  return {
    from: formatISO(startOfMonth(now), { representation: 'date' }),
    to: formatISO(endOfMonth(now), { representation: 'date' }),
  };
}

// ============================================================================
// Interface do Store
// ============================================================================

interface DateRangeState extends Range {
  // Setters individuais
  setFrom: (iso: string) => void;
  setTo: (iso: string) => void;
  
  // Setter de range completo (permite partial)
  setRange: (r: Partial<Range>) => void;
  
  // Reset para padrão (mês atual)
  reset: () => void;
}

// ============================================================================
// Store Zustand com Persist (LocalStorage)
// ============================================================================

export const useDateRange = create<DateRangeState>()(
  persist(
    (set) => ({
      // Estado inicial: mês atual
      ...getDefaultRange(),

      // Atualizar apenas "from"
      setFrom: (from) => set((state) => ({ ...state, from })),

      // Atualizar apenas "to"
      setTo: (to) => set((state) => ({ ...state, to })),

      // Atualizar range completo ou parcial
      setRange: (r) => set((state) => ({ ...state, ...r })),

      // Resetar para mês atual
      reset: () => set(getDefaultRange()),
    }),
    {
      name: 'nocry:dateRange', // Nome da chave no localStorage
    }
  )
);

// ============================================================================
// Exports Adicionais
// ============================================================================

// Re-export helpers úteis de date-fns para facilitar uso
export { startOfMonth, endOfMonth, formatISO, addDays };

