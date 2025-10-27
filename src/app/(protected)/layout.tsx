// ============================================================================
// (protected)/layout.tsx - Layout de Grupo Protegido (Server Component)
// ============================================================================
// PROPÓSITO:
// - Proteger todas as rotas dentro deste grupo no servidor
// - Verificar autenticação + onboarding completado
// - Redirecionar se necessário (login ou onboarding)
//
// SEGURANÇA:
// - Server Component - executa APENAS no servidor
// - Usa getUser() (valida com Auth server) em vez de getSession()
// - Impossível bypassar com JavaScript client-side
//
// ROTAS PROTEGIDAS (dentro deste grupo):
// - / (dashboard) - EXIGE onboarding
// - /carteira - EXIGE onboarding
// - /transacoes - EXIGE onboarding
// - /faturas - EXIGE onboarding
// - /fixas - EXIGE onboarding
// - /emprestimos - EXIGE onboarding
// - /categorias - EXIGE onboarding
// - /digital - EXIGE onboarding
// - /config - LIBERADO (exceção, não exige onboarding)
// - /admin - LIBERADO (exceção, não exige onboarding)
// - /analytics - EXIGE onboarding
// - /crypto - EXIGE onboarding
// - /profile - EXIGE onboarding
// - /dev - EXIGE onboarding
//
// NOTA: /login e /onboarding estão no grupo (public), não passam por aqui.
// ============================================================================

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthUserAndProfile } from "@/lib/session";
import AppShell from "@/components/layout/AppShell";

// Força sempre dinâmico (nunca cacheia)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Força runtime Node.js para garantir compatibilidade com cookies
export const runtime = "nodejs";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Obter usuário autenticado (usa getUser() - seguro no servidor)
  // ─────────────────────────────────────────────────────────────────────
  const { user, profile } = await getAuthUserAndProfile();

  // ─────────────────────────────────────────────────────────────────────
  // 2. Se não há usuário autenticado, redirecionar para login
  // ─────────────────────────────────────────────────────────────────────
  if (!user) {
    console.log("[ProtectedLayout] 🚫 Não autenticado, redirect para /login");
    redirect("/login");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Obter pathname atual para verificar exceções
  // ─────────────────────────────────────────────────────────────────────
  let currentPath = "/";
  try {
    const headersList = await headers();
    const pathname = headersList.get("x-invoke-path") || headersList.get("referer");
    if (pathname) {
      if (pathname.startsWith("http")) {
        const url = new URL(pathname);
        currentPath = url.pathname;
      } else {
        currentPath = pathname;
      }
    }
  } catch (err) {
    console.warn("[ProtectedLayout] Erro ao obter path atual:", err);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. Rotas que NÃO exigem onboarding completado
  // ─────────────────────────────────────────────────────────────────────
  const onboardingExceptions = ["/config", "/admin"];
  const isException = onboardingExceptions.some(path => currentPath.startsWith(path));

  // ─────────────────────────────────────────────────────────────────────
  // 5. Se onboarding não foi completado E não é exceção → redirect
  // ─────────────────────────────────────────────────────────────────────
  if (!profile?.onboarding_done && !isException) {
    console.log("[ProtectedLayout] 🚀 Onboarding pendente, redirect para /onboarding");
    redirect("/onboarding");
  }

  if (isException && !profile?.onboarding_done) {
    console.log("[ProtectedLayout] ⚠️ Acesso a", currentPath, "sem onboarding (exceção permitida)");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 6. Usuário autenticado (+ onboarding OK ou exceção): renderiza com AppShell
  // ─────────────────────────────────────────────────────────────────────
  console.log("[ProtectedLayout] ✅ Acesso liberado para:", user.email);

  return <AppShell>{children}</AppShell>;
}
