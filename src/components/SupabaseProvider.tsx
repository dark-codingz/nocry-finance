// /src/components/SupabaseProvider.tsx
'use client';

// Propósito: Criar um provedor de contexto (Context Provider) para a sessão do Supabase.
// Este componente garante que a sessão do usuário seja gerenciada de forma centralizada
// e disponibilizada para todos os Componentes de Cliente (Client Components) da aplicação.

import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowserClient';
import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';

// NOTA SOBRE O PROVIDER DE SESSÃO:
// O `SessionContextProvider` é um componente do pacote `@supabase/auth-helpers-react`.
// Ele funciona como um wrapper que:
// 1. Inicializa o cliente Supabase uma única vez usando o `useState` para evitar
//    recriações em cada renderização, o que é crucial para a performance.
// 2. Usa o Context API do React para "injetar" a instância do cliente Supabase e
//    as informações da sessão (usuário, token, etc.) na árvore de componentes.
//
// Qualquer componente filho (que seja um Client Component) pode então acessar a sessão
// de forma padronizada usando os hooks `useSupabaseClient` e `useSession` dos
// auth-helpers, sem precisar se preocupar com a inicialização do cliente.

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabaseClient] = useState<SupabaseClient>(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
