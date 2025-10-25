// ============================================================================
// Hook: useIsAdmin
// ============================================================================
// PROPÓSITO:
// - Verificar se o usuário autenticado está na whitelist de administradores
// - Usado para controlar acesso a funcionalidades em desenvolvimento
//
// RETORNO:
// - isAdmin: boolean (true se está na whitelist)
// - isLoading: boolean (true enquanto está buscando sessão)
// - email: string | null (email do usuário autenticado)
//
// USO:
// const { isAdmin, isLoading } = useIsAdmin();
// if (!isAdmin) return <DevWarning />;
// ============================================================================

'use client';

import { useSession } from '@supabase/auth-helpers-react';

export function useIsAdmin() {
  const session = useSession();

  // Lista de administradores da whitelist
  const adminWhitelist = (process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (session?.user?.email ?? '').toLowerCase();
  const isAdmin = email && adminWhitelist.includes(email);
  const isLoading = !session; // Ainda carregando se não tem sessão

  return {
    isAdmin: Boolean(isAdmin),
    isLoading,
    email: session?.user?.email ?? null,
  };
}



