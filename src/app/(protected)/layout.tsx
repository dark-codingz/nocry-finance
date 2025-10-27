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
import { serverAuthGuard } from "@/lib/auth/guard";
import { getAuthUserAndProfile } from "@/lib/session";
import AppShell from "@/components/layout/AppShell";

// Força sempre dinâmico (nunca cacheia)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Força runtime Node.js para garantir compatibilidade com cookies
export const runtime = "nodejs";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Obter usuário autenticado usando o guard (usa getUser() - seguro)
  // ─────────────────────────────────────────────────────────────────────
  const { user, source, errorReason, session } = await serverAuthGuard();

  // ─────────────────────────────────────────────────────────────────────
  // 2. Se não há usuário autenticado, redirecionar para login
  // ─────────────────────────────────────────────────────────────────────
  if (!user) {
    console.log("[ProtectedLayout] 🚫 Não autenticado, redirect para /login");
    console.log("[ProtectedLayout] 🔍 Debug:", { source, errorReason, hasSession: !!session });
    redirect("/login");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Obter profile do usuário (para verificar onboarding)
  // ─────────────────────────────────────────────────────────────────────
  const { profile } = await getAuthUserAndProfile();

  // ─────────────────────────────────────────────────────────────────────
  // 4. Obter pathname atual para verificar exceções
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
  // 5. Rotas que NÃO exigem onboarding completado
  // ─────────────────────────────────────────────────────────────────────
  const onboardingExceptions = ["/config", "/admin"];
  const isException = onboardingExceptions.some(path => currentPath.startsWith(path));

  // ─────────────────────────────────────────────────────────────────────
  // 6. Se onboarding não foi completado E não é exceção → redirect
  // ─────────────────────────────────────────────────────────────────────
  if (!profile?.onboarding_done && !isException) {
    console.log("[ProtectedLayout] 🚀 Onboarding pendente, redirect para /onboarding");
    redirect("/onboarding");
  }

  if (isException && !profile?.onboarding_done) {
    console.log("[ProtectedLayout] ⚠️ Acesso a", currentPath, "sem onboarding (exceção permitida)");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 7. Usuário autenticado (+ onboarding OK ou exceção): renderiza com AppShell
  // ─────────────────────────────────────────────────────────────────────
  console.log("[ProtectedLayout] ✅ Acesso liberado para:", user.email, "| via:", source);

  return (
    <div suppressHydrationWarning>
      {/* Painel de Debug - Remover após confirmar que funciona */}
      <div style={{fontFamily:"monospace",fontSize:12,background:"#111",color:"#0f0",padding:8}}>
        <b>Auth OK</b> • user: {user?.id} • via: {source} • sess?: {session ? "yes" : "no"} • err: {errorReason ?? "-"}
      </div>
      <AppShell>{children}</AppShell>
    </div>
  );
}
