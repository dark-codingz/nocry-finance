import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rota de Debug - Whoami
 * 
 * Confirma se o token JWT chega corretamente ao servidor
 * 
 * Uso: GET /api/_debug/categories/whoami
 * 
 * Retorna:
 * - whoami: resultado do RPC debug_whoami() (uid, role, jwt claims)
 * - getUser: resultado de auth.getUser()
 * - user: dados do usuário autenticado
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // 1) RPC whoami (verifica uid no contexto SQL)
    const { data: whoamiData, error: whoamiError } = await supabase.rpc("debug_whoami");
    
    // 2) getUser (verifica token JWT no servidor)
    const { data: userData, error: userError } = await supabase.auth.getUser();

    return new Response(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          whoami: {
            data: whoamiData,
            error: whoamiError?.message ?? null,
          },
          getUser: {
            user: userData?.user ?? null,
            error: userError?.message ?? null,
          },
          summary: {
            authenticated: !!userData?.user,
            uid_match: whoamiData?.uid === userData?.user?.id,
            uid_present: !!whoamiData?.uid,
          },
        },
        null,
        2
      ),
      { 
        status: 200, 
        headers: { "content-type": "application/json" } 
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: error?.message || String(error),
          stack: error?.stack,
        },
        null,
        2
      ),
      { 
        status: 500, 
        headers: { "content-type": "application/json" } 
      }
    );
  }
}

