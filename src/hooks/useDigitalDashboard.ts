// /src/hooks/useDigitalDashboard.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { getDigitalMonthSummary, getOfferRanking } from "@/services/digitalDashboard";
import { DigitalDashboardData, EMPTY_DIGITAL_DATA } from "@/types/digitalDashboard";

/**
 * Hook para buscar os dados consolidados para o Dashboard Digital.
 * Este hook NUNCA retorna undefined; ele usa objetos vazios seguros para evitar crashes.
 * A chamada do hook é incondicional; a query interna é desativada se não houver usuário.
 */
export function useDigitalDashboard(month: string): {
  data: DigitalDashboardData;
  isLoading: boolean;
  error: unknown;
} {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ["digital-dashboard", userId, month],
    // A query só será executada se houver um userId.
    enabled: !!userId,
    // initialData garante que `data` nunca seja undefined, mesmo antes da primeira busca.
    initialData: EMPTY_DIGITAL_DATA,
    queryFn: async (): Promise<DigitalDashboardData> => {
      // O `enabled` acima garante que `userId` não será nulo aqui.
      const [summary, topOffers] = await Promise.all([
        getDigitalMonthSummary(supabase, userId!, month),
        getOfferRanking(supabase, userId!, month),
      ]);
      return {
        summary,
        topOffers: topOffers ?? [],
      };
    },
  });

  // Garante um retorno concreto mesmo que o TanStack Query retorne undefined temporariamente.
  return {
    data: query.data ?? EMPTY_DIGITAL_DATA,
    isLoading: query.isLoading,
    error: query.error,
  };
}
