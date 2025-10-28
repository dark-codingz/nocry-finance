"use client";
import { useQuery } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { getRecentFinanceActivity, type FinanceActivityFilters, type FinanceActivity } from '@/services/recentActivity';

export function useRecentFinance(filters: FinanceActivityFilters) {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const userId   = session?.user?.id;

  const query = useQuery({
    queryKey: ['recent-finance', userId, filters],
    enabled: !!userId && !!filters.firstDay && !!filters.lastDay,
    queryFn: () => getRecentFinanceActivity(supabase, userId!, filters),
    initialData: [] as FinanceActivity[],
  });

  return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}




