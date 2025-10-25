// ============================================================================
// (public)/onboarding/page.tsx - Página de Setup Inicial (Server Component)
// ============================================================================
// PROPÓSITO:
// - Verificar sessão e status do onboarding
// - Redirecionar se não está logado (vai para /login)
// - Redirecionar se já completou (vai para /)
// - Renderizar o wizard de onboarding (client component)
// 
// IMPORTANTE: Esta página está no grupo (public) para NÃO passar pelo
// ProtectedLayout e evitar loop de redirect.
// ============================================================================

import { redirect } from "next/navigation";
import { getAuthUserAndProfile, getDisplayName } from "@/lib/session";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingPage() {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Obter usuário autenticado (usa getUser() - seguro no servidor)
  // ─────────────────────────────────────────────────────────────────────
  const { user, profile } = await getAuthUserAndProfile();

  // ─────────────────────────────────────────────────────────────────────
  // 2. Se não está logado, redireciona para login
  // ─────────────────────────────────────────────────────────────────────
  if (!user) {
    console.log("[Onboarding] 🚫 Não autenticado, redirect para /login");
    redirect("/login");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Se já completou o onboarding, redireciona para o dashboard
  // ─────────────────────────────────────────────────────────────────────
  if (profile?.onboarding_done) {
    console.log("[Onboarding] ✅ Já completado, redirect para /");
    redirect("/");
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. Renderizar wizard de onboarding (com nome centralizado)
  // ─────────────────────────────────────────────────────────────────────
  const displayName = getDisplayName(profile, user.email);
  console.log("[Onboarding] 🚀 Iniciando wizard para:", user.email, "- Nome:", displayName);
  
  return <OnboardingWizard fullName={displayName} />;
}

