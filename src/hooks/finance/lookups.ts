// ============================================================================
// Hooks: Lookups de Finanças (Contas, Cartões, Categorias)
// ============================================================================
// PROPÓSITO:
// - Busca dados básicos para popular selects em formulários
// - Cache automático com TanStack Query
// - Reutilizável em qualquer formulário da aplicação
//
// HOOKS:
// - useAccounts(): Lista todas as contas (ordenadas por nome)
// - useCards(): Lista todos os cartões (ordenados por nome)
// - useCategories(kind?): Lista categorias, opcionalmente filtradas por tipo
//
// USO:
// const { data: accounts = [] } = useAccounts();
// const { data: expenseCategories = [] } = useCategories("expense");
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ────────────────────────────────────────────────────────────────────────
// useAccounts - Lista todas as contas
// ────────────────────────────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────
// useCards - Lista todos os cartões
// ────────────────────────────────────────────────────────────────────────
export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('cards')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// ────────────────────────────────────────────────────────────────────────
// useCategoriesForSelect - Lista categorias para selects (simples)
// ────────────────────────────────────────────────────────────────────────
// NOTA: Para CRUD completo, use useCategoriesList de @/hooks/finance/categories
export function useCategoriesForSelect(kind?: 'expense' | 'income') {
  return useQuery({
    queryKey: ['categories-select', kind],
    queryFn: async () => {
      const supabase = createClientComponentClient();

      let query = supabase
        .from('categories')
        .select('id, name, type')
        .eq('archived', false) // Apenas categorias ativas
        .order('name');

      // Filtrar por tipo se especificado
      if (kind) {
        query = query.eq('type', kind);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// Alias para compatibilidade
export const useCategories = useCategoriesForSelect;

