// /src/lib/supabaseBrowserClient.ts
'use client';

// Propósito: Criar uma instância do cliente Supabase para uso EXCLUSIVO em
// Componentes de Cliente (Client Components) no Next.js App Router.

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// NOTA SOBRE OS TIPOS DE CLIENTE SUPABASE:
//
// 1. Client Component Client (este arquivo):
//    - Usa `createClientComponentClient` dos helpers do Next.js.
//    - Seguro para ser usado no lado do cliente (em componentes com 'use client').
//    - Utiliza as chaves públicas lidas automaticamente de `process.env.NEXT_PUBLIC_*`.
//    - Essencial para interações no navegador, como login, logout e busca de dados
//      em resposta a ações do usuário.
//
// 2. Server Component / Action Client:
//    - Usa `createServerComponentClient` ou `createServerActionClient`.
//    - Executado exclusivamente no servidor, nunca no browser.
//    - Pode ser configurado para usar a `anon_key` para agir em nome do usuário
//      ou a `service_role_key` para operações com privilégios elevados.
//
// 3. Service Role Client (Chave de Serviço):
//    - A `service_role_key` concede acesso total ao banco de dados, ignorando
//      todas as políticas de RLS.
//    - JAMAIS deve ser exposta no lado do cliente. Use-a apenas no servidor
//      para tarefas administrativas que precisam bypassar a segurança de linha.

export const createSupabaseBrowserClient = () => createClientComponentClient();
