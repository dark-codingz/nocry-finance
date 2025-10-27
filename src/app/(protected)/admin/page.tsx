// app/(protected)/admin/page.tsx

// ============================================================================
// Página de Administração - Server Component com Guard de Whitelist
// ============================================================================
// Propósito: Validar whitelist no servidor e renderizar interface de admin.
//
// SEGURANÇA:
// - Este é um Server Component - executa APENAS no servidor
// - Verifica whitelist ANTES de renderizar qualquer conteúdo
// - Se não estiver na whitelist, mostra mensagem de "Acesso Restrito"
// - Validação server-side impossível de bypassar
//
// ARQUITETURA:
// - page.tsx (Server): Valida whitelist e passa props para Client
// - AdminClient.tsx (Client): Renderiza UI interativa (forms, estado)
//
// CAMADAS DE PROTEÇÃO:
// 1. Middleware: Redirect se não autenticado
// 2. Layout (protected): Guard de sessão server-side
// 3. Esta page: Guard de whitelist server-side
// 4. API route: Valida whitelist novamente + rate limit
// ============================================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminClient from "./AdminClient";

// Força sempre dinâmico (nunca cacheia)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Força runtime Node.js para garantir compatibilidade com cookies
export const runtime = "nodejs";

export default async function AdminPage() {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Criar cliente Supabase server-side (cookies retorna Promise)
  // ─────────────────────────────────────────────────────────────────────
  const supabase = createServerComponentClient({
    cookies,
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2. Verificar sessão e obter usuário
  // ─────────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Se não há usuário (não deveria acontecer pois layout já protege),
  // redireciona para login
  if (!user) {
    console.log("[AdminPage] ❌ Usuário não encontrado, redirect para /login");
    redirect("/login?next=/admin");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Validar whitelist de administradores
  // ─────────────────────────────────────────────────────────────────────
  const adminWhitelist = (process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (user.email ?? "").toLowerCase();
  const isAdmin = email && adminWhitelist.includes(email);

  console.log("[AdminPage] Email:", email, "| isAdmin:", isAdmin);

  // ─────────────────────────────────────────────────────────────────────
  // 4. Se não é admin, renderiza mensagem de "Acesso Restrito"
  // ─────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h1>
          <p className="text-sm text-red-600 mb-2">
            Voce nao tem permissao para acessar esta pagina.
          </p>
          {email && (
            <p className="text-xs text-gray-500 mt-2 mb-6">
              Email atual: <span className="font-mono">{email}</span>
            </p>
          )}
          <a
            href="/"
            className="inline-block w-full px-4 py-2 rounded-md bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // 5. Admin autorizado: renderiza interface de administração
  // ─────────────────────────────────────────────────────────────────────
  console.log("[AdminPage] ✅ Admin autorizado, renderizando AdminClient");
  
  return <AdminClient userEmail={email} />;
}
