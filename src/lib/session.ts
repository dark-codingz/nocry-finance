// ============================================================================
// session.ts - Server-side Session & Profile Helper (com Get-or-Create)
// ============================================================================
// PROPÓSITO:
// - Obter usuário autenticado e perfil no servidor (Server Components)
// - Usa getUser() (valida com Auth server) em vez de getSession()
// - Get-or-Create: cria perfil automaticamente se não existir
// - Usado em layouts e páginas para verificar auth + onboarding
// ============================================================================

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export type UserProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  is_whitelisted: boolean | null;
  onboarding_done: boolean | null;
  onboarding_completed_at: string | null;
  onboarding_step: string | null;
};

export type AuthUserAndProfile = {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: UserProfile | null;
};

/**
 * Retorna o nome de exibição do usuário com fallback cascata.
 * 
 * LÓGICA CENTRALIZADA:
 * 1. display_name (se existir)
 * 2. full_name (se existir)
 * 3. parte do email antes do @ (se existir)
 * 4. "Membro" (fallback final)
 * 
 * @param profile - Perfil do usuário (pode ser null)
 * @param userEmail - Email do usuário (opcional, para fallback)
 * @returns Nome para exibição
 * 
 * @example
 * ```ts
 * const { user, profile } = await getAuthUserAndProfile();
 * const displayName = getDisplayName(profile, user?.email);
 * // "João Silva" | "joao.silva" | "Membro"
 * ```
 */
export function getDisplayName(
  profile: UserProfile | null,
  userEmail?: string
): string {
  return (
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    userEmail?.split("@")[0] ||
    "Membro"
  );
}

/**
 * Retorna o usuário autenticado (validado no Auth server) e o perfil.
 * 
 * GET-OR-CREATE:
 * - Se o perfil não existir, cria automaticamente
 * - Nome inicial vem de user_metadata.full_name ou email
 * 
 * SEGURANÇA:
 * - Usa getUser() em vez de getSession() para validação server-side segura
 * - getUser() valida o token JWT com o servidor de autenticação
 * - RLS garante que só pode criar/ler/atualizar próprio perfil
 * 
 * Para usar em Server Components (layouts, páginas).
 * 
 * @returns Objeto com user e profile (ou null se não autenticado)
 * 
 * @example
 * ```ts
 * const { user, profile } = await getAuthUserAndProfile();
 * if (!user) redirect('/login');
 * if (!profile?.onboarding_completed_at) redirect('/onboarding');
 * ```
 */
export async function getAuthUserAndProfile(): Promise<AuthUserAndProfile> {
  const cookieStore = await cookies();
  const sb = createServerComponentClient({ cookies: () => cookieStore });

  // ─────────────────────────────────────────────────────────────────────
  // 1. VALIDAR USUÁRIO (com Auth server)
  // ─────────────────────────────────────────────────────────────────────
  const { data: userData, error: userErr } = await sb.auth.getUser();

  if (userErr || !userData?.user) {
    return { user: null, profile: null };
  }

  const user = userData.user;

  // ─────────────────────────────────────────────────────────────────────
  // 2. TENTAR BUSCAR PERFIL (com display_name)
  // ─────────────────────────────────────────────────────────────────────
  const { data: profile, error: profErr } = await sb
    .from("profiles")
    .select("id, full_name, display_name, username, is_whitelisted, onboarding_done, onboarding_completed_at, onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    console.error("[session] ⚠️ Error fetching profile (SELECT):", profErr);
    // Não quebra a página, mas retorna null para forçar fallback
    return { user, profile: null };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. SE PERFIL EXISTE, RETORNAR
  // ─────────────────────────────────────────────────────────────────────
  if (profile) {
    console.log("[session] ✅ Profile encontrado:", profile.full_name);
    return { user, profile };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. SE NÃO EXISTE, CRIAR (Get-or-Create com display_name)
  // ─────────────────────────────────────────────────────────────────────
  console.log("[session] 🆕 Profile não existe, criando automaticamente...");

  // Nome fallback: tenta user_metadata.full_name, depois parte do email, senão "Membro"
  const fallbackName =
    (user.user_metadata?.full_name as string) ||
    (user.email?.split("@")[0] ?? "Membro");

  const { data: created, error: insErr } = await sb
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fallbackName,
      display_name: fallbackName, // ← Mesmo valor inicial
      onboarding_done: false,
    })
    .select("id, full_name, display_name, username, is_whitelisted, onboarding_done, onboarding_completed_at, onboarding_step")
    .single();

  if (insErr) {
    console.error("[session] ❌ Error creating profile (INSERT):", insErr);
    // Se falhar, retorna null (usuário terá que resolver manualmente)
    return { user, profile: null };
  }

  console.log("[session] ✅ Profile criado com sucesso:", created.full_name);
  return { user, profile: created };
}
