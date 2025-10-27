import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const h = headers();
    const supabase = createServerClient(URL, KEY, {
      headers: { get: (n: string) => h.get(n) ?? undefined },
    });

    // Tentar RPC whoami (pode não existir se migration não foi aplicada)
    let whoamiData = null;
    let whoamiError = null;
    try {
      const whoamiResult = await supabase.rpc("debug_whoami");
      whoamiData = whoamiResult.data;
      whoamiError = whoamiResult.error?.message ?? null;
    } catch (e: any) {
      whoamiError = `RPC failed: ${e?.message || String(e)}`;
    }

    // Tentar getUser
    const { data: userData, error: uErr } = await supabase.auth.getUser();

    return new Response(JSON.stringify({
      ok: true,
      whoami: {
        data: whoamiData,
        error: whoamiError
      },
      getUser: {
        user: userData?.user ?? null,
        error: uErr?.message ?? null
      },
      summary: {
        authenticated: !!userData?.user,
        whoami_available: whoamiError === null,
        uid: userData?.user?.id ?? null
      }
    }, null, 2), { 
      status: 200, 
      headers: { "content-type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      ok: false,
      error: error?.message || String(error),
      stack: error?.stack
    }, null, 2), { 
      status: 500, 
      headers: { "content-type": "application/json" } 
    });
  }
}

