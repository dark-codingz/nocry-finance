import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/debug-insert?name=Alimentacao&type=expense
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const type = url.searchParams.get("type") ?? "";
  return doInsert(name, type);
}

// POST com JSON { name, type }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  return doInsert(body?.name ?? "", body?.type ?? "");
}

async function doInsert(name: string, type: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(URL, KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar erro em route handler
          }
        },
      },
    });

    // Tentar whoami (opcional)
    let whoamiData = null;
    try {
      const whoamiResult = await supabase.rpc("debug_whoami");
      whoamiData = whoamiResult.data;
    } catch (e) {
      // Ignorar erro de whoami (não é crítico)
    }

    // Verificar autenticação
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ 
        ok: false, 
        step: "auth", 
        whoami: whoamiData, 
        error: userError?.message || "Não autenticado" 
      }, null, 2), { status: 401, headers: { "content-type": "application/json" } });
    }

    // Validar campos
    if (!name || !type) {
      return new Response(JSON.stringify({ 
        ok: false, 
        step: "validate", 
        error: "name e type são obrigatórios",
        hint: "Use ?name=Teste&type=expense"
      }, null, 2), { status: 400, headers: { "content-type": "application/json" } });
    }

    // Tentar INSERT
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, type }) // DEFAULT preenche user_id
      .select("id,name,type,user_id")
      .single();

    const status = error ? 400 : 201;
    return new Response(JSON.stringify({
      ok: !error, 
      whoami: whoamiData, 
      user: {
        id: userData.user.id,
        email: userData.user.email
      },
      sent: { name, type }, 
      data, 
      error: error?.message ?? null,
      error_details: error ? {
        code: error.code,
        details: error.details,
        hint: error.hint
      } : null
    }, null, 2), { status, headers: { "content-type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({
      ok: false,
      step: "exception",
      error: error?.message || String(error),
      stack: error?.stack
    }, null, 2), { 
      status: 500, 
      headers: { "content-type": "application/json" } 
    });
  }
}

