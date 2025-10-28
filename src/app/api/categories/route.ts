import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs"; // ⚠️ CRITICAL: não usar edge (precisa do token)
export const dynamic = "force-dynamic";

/**
 * POST /api/categories
 * Cria uma nova categoria
 * 
 * Body: { name: string, type: 'expense' | 'income' }
 * 
 * IMPORTANTE:
 * - NÃO enviar user_id do cliente
 * - DEFAULT auth.uid() preenche automaticamente
 * - RLS valida se user_id == auth.uid()
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    // 1) Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[POST /api/categories] Auth error:", authError?.message || "No user");
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Não autenticado",
        }),
        { 
          status: 401,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 2) Validar body
    const body = await req.json();

    if (!body?.name || !body?.type) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Campos obrigatórios: name e type",
          received: body,
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Validar type
    const validTypes = ['expense', 'income'];
    if (!validTypes.includes(body.type)) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `type deve ser 'expense' ou 'income', recebido: '${body.type}'`,
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 3) INSERT com user_id do token
    const { data, error } = await supabase
      .from("categories")
      .insert({ 
        name: body.name, 
        type: body.type,
        archived: false,
        user_id: user.id, // Garantir que é o user_id do token
      })
      .select("id, name, type, user_id, created_at")
      .single();

    if (error) {
      console.error("[POST /api/categories] Insert error:", error);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        data,
      }),
      { 
        status: 201,
        headers: { "content-type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[POST /api/categories] Exception:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error?.message || String(error),
        stack: error?.stack,
      }),
      { 
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

/**
 * GET /api/categories
 * Lista todas as categorias do usuário
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Não autenticado",
        }),
        { 
          status: 401,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Buscar categorias
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, type, user_id, archived, created_at")
      .order("name");

    if (error) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: error.message,
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: categories?.length || 0,
        categories: categories || [],
        user: {
          id: user.id,
          email: user.email,
        },
      }),
      { 
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error?.message || String(error),
      }),
      { 
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}


