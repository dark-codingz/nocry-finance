// src/hooks/useRecentActivity.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { getRecentActivity } from '@/services/recentActivity';
import type { RecentActivityItem } from '@/types/recentActivity';

/**
 * Hook para buscar as atividades recentes do usuário.
 * A chamada do hook é incondicional; a query interna é desativada se não houver usuário.
 */
export function useRecentActivity(limit: number = 10): {
  data: RecentActivityItem[];
  isLoading: boolean;
  error: unknown;
} {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ['recent-activity', userId, limit],
    enabled: !!userId,
    initialData: [], // O estado inicial seguro é um array vazio.
    queryFn: async (): Promise<RecentActivityItem[]> => {
      // `enabled` garante que userId não será nulo aqui.
      return getRecentActivity(supabase, userId!, limit);
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
