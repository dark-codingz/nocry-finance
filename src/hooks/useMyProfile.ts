// ============================================================================
// Hooks: useMyProfile
// ============================================================================
// PROPÓSITO:
// - React Query hooks para gerenciar perfil do usuário
// - useMyProfile: Busca perfil do usuário autenticado
// - useUpsertMyProfile: Cria/atualiza perfil (mutation)
//
// USO:
// const { data: profile } = useMyProfile();
// const upsert = useUpsertMyProfile();
// upsert.mutate({ username: "joao123" });
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/profile';
import type { Profile } from '@/services/profile';

// ────────────────────────────────────────────────────────────────────────────
// useMyProfile - Busca perfil do usuário autenticado (com tipagem explícita)
// ────────────────────────────────────────────────────────────────────────────
export function useMyProfile() {
  return useQuery<Profile | null>({
    queryKey: ['my-profile'],
    queryFn: api.getMyProfile,
    staleTime: 10_000, // Cache por 10 segundos
  });
}

// ────────────────────────────────────────────────────────────────────────────
// useUpsertMyProfile - Cria/atualiza perfil (mutation)
// ────────────────────────────────────────────────────────────────────────────
export function useUpsertMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.upsertMyProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

