// ============================================================================
// Supabase Server Client - Next.js App Router
// ============================================================================
// Cria um cliente Supabase para uso no SERVIDOR (Server Components/Actions)
// Usa @supabase/ssr que é a forma correta para Next.js 13+
// ============================================================================

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase para uso em Server Components e Server Actions.
 * 
 * IMPORTANTE:
 * - Usa @supabase/ssr (não @supabase/auth-helpers-nextjs)
 * - Implementa corretamente o objeto cookies com get/set/remove
 * - Compatível com Next.js 16 (cookies() retorna Promise)
 * 
 * @returns Cliente Supabase configurado para o servidor
 * 
 * @example
 * ```ts
 * // Em um Server Component:
 * const supabase = await createSupabaseServer();
 * const { data: { session } } = await supabase.auth.getSession();
 * ```
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Ignorar erro em rotas readonly (Server Components)
          // Cookies só podem ser setados em Server Actions/Route Handlers
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch (error) {
          // Ignorar erro em rotas readonly
        }
      },
    },
  });
}

