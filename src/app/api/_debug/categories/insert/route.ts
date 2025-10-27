import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rota de Debug - Testar INSERT de categoria com RLS
 * 
 * Aceita:
 * - GET: com query params ?name=...&type=...
 * - POST: com JSON body { name, type }
 * 
 * Testa se:
 * 1. Usuário está autenticado
 * 2. whoami retorna uid correto
 * 3. INSERT funciona com ou sem user_id explícito
 * 4. RLS permite a operação
 * 
 * Uso: 
 * - POST /api/_debug/categories/insert
 * - GET /api/_debug/categories/insert?name=Teste&type=expense
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const type = url.searchParams.get("type") || "";
  return doInsert(name, type);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = body?.name || "";
  const type = body?.type || "";
  return doInsert(name, type);
}

async function doInsert(name: string, type: string) {
  try {
    const supabase = await createSupabaseServer();

    // 1) Debug whoami
    const { data: whoamiData, error: whoamiError } = await supabase.rpc("debug_whoami");
    
    // 2) Verificar autenticação
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            step: "auth",
            whoami: whoamiData,
            whoami_error: whoamiError?.message ?? null,
            error: userError?.message || "Não autenticado",
          },
          null,
          2
        ),
        { 
          status: 401, 
          headers: { "content-type": "application/json" } 
        }
      );
    }

    // 3) Validar campos
    if (!name || !type) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            step: "validate",
            error: "name e type são obrigatórios",
            received: { name, type },
            hint: "Use ?name=Teste&type=expense ou POST com { name, type }",
          },
          null,
          2
        ),
        { 
          status: 400, 
          headers: { "content-type": "application/json" } 
        }
      );
    }

    // Validar type
    const validTypes = ['expense', 'income'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            step: "validate",
            error: `type deve ser 'expense' ou 'income', recebido: '${type}'`,
            valid_types: validTypes,
          },
          null,
          2
        ),
        { 
          status: 400, 
          headers: { "content-type": "application/json" } 
        }
      );
    }

    // 4) INSERT (usando DEFAULT auth.uid())
    const { data, error: insertError } = await supabase
      .from("categories")
      .insert({
        name,
        type,
        archived: false,
        // ⚠️ NÃO enviar user_id - DEFAULT auth.uid() preenche
        // Alternativa: user_id: userData.user.id (mais seguro)
      })
      .select("id, name, type, user_id, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            step: "insert",
            whoami: whoamiData,
            user: {
              id: userData.user.id,
              email: userData.user.email,
            },
            sent: { name, type },
            error: insertError.message,
            error_code: insertError.code,
            error_details: insertError.details,
            error_hint: insertError.hint,
          },
          null,
          2
        ),
        { 
          status: 400, 
          headers: { "content-type": "application/json" } 
        }
      );
    }

    // 5) Verificar user_id
    const userIdMatch = data.user_id === userData.user.id;

    // 6) Limpar (DELETE) - comentar se quiser manter para inspeção
    await supabase
      .from("categories")
      .delete()
      .eq("id", data.id);

    return new Response(
      JSON.stringify(
        {
          ok: true,
          step: "success",
          whoami: whoamiData,
          user: {
            id: userData.user.id,
            email: userData.user.email,
          },
          sent: { name, type },
          data,
          cleanup: {
            deleted: true,
            note: "Categoria criada e deletada automaticamente",
          },
          summary: {
            user_id_match: userIdMatch,
            default_working: userIdMatch,
            message: userIdMatch
              ? "✅ DEFAULT auth.uid() funcionando perfeitamente!"
              : "⚠️ user_id não corresponde ao usuário logado",
          },
        },
        null,
        2
      ),
      { 
        status: 201, 
        headers: { "content-type": "application/json" } 
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          step: "exception",
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

