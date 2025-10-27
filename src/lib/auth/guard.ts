import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Guard de autenticação server-side usando getUser() (recomendação Supabase)
 * com fallback para getSession().
 * 
 * IMPORTANTE: Este helper deve ser usado APENAS em Server Components.
 * Para Client Components, use createSupabaseBrowser() de @/lib/supabase/client
 */
export async function serverAuthGuard() {
  let user = null;
  let session = null;
  let source: "getUser" | "getSession" | "none" = "none";
  let errorReason: string | null = null;

  try {
    // Usar o helper que já funciona (createSupabaseServer)
    const supabase = await createSupabaseServer();

    // 1) Tentar getUser() primeiro (recomendação do Supabase)
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        errorReason = `getUser: ${error.message}`;
      } else {
        user = data.user ?? null;
        source = "getUser";
      }
    } catch (e: any) {
      errorReason = `getUser threw: ${e?.message ?? String(e)}`;
    }

    // 2) Fallback para getSession() se getUser() falhou
    if (!user) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error) {
          session = data.session ?? null;
          user = session?.user ?? null;
          source = "getSession";
        } else {
          if (!errorReason) errorReason = `getSession: ${error.message}`;
        }
      } catch (e: any) {
        if (!errorReason) errorReason = `getSession threw: ${e?.message ?? String(e)}`;
      }
    }
  } catch (e: any) {
    errorReason = `createSupabaseServer threw: ${e?.message ?? String(e)}`;
  }

  return { user, session, source, errorReason };
}

export type GuardResult = Awaited<ReturnType<typeof serverAuthGuard>>;

