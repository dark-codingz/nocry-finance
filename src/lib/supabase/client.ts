// ============================================================================
// Supabase Browser Client - Next.js App Router
// ============================================================================
// Cria um cliente Supabase para uso no BROWSER (Client Components)
// Usa @supabase/ssr que é a forma correta para Next.js 13+
// ============================================================================

"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase para uso em Client Components.
 * 
 * IMPORTANTE:
 * - Usa @supabase/ssr (não @supabase/auth-helpers-react)
 * - Gerencia cookies automaticamente no browser
 * - Deve ser usado apenas em componentes com "use client"
 * 
 * @returns Cliente Supabase configurado para o browser
 * 
 * @example
 * ```ts
 * // Em um Client Component:
 * "use client";
 * const supabase = createSupabaseBrowser();
 * const { data } = await supabase.auth.signInWithPassword({ email, password });
 * ```
 */
export function createSupabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

