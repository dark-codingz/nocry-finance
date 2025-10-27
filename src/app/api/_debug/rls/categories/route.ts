import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rota de Debug - Testar RLS em Categories
 * 
 * Testa:
 * 1. INSERT de categoria (verifica se RLS permite)
 * 2. SELECT da categoria recém-criada
 * 3. Retorna user_id para confirmar ownership
 * 
 * Uso:
 * POST /api/_debug/rls/categories
 * 
 * Esperado (sucesso):
 * {
 *   ok: true,
 *   operation: "insert",
 *   data: { id: "...", name: "Teste RLS ...", user_id: "..." },
 *   session: { user_id: "..." }
 * }
 * 
 * Esperado (erro RLS):
 * {
 *   ok: false,
 *   operation: "insert",
 *   error: "new row violates row-level security policy for table \"categories\""
 * }
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServer();

    // 1) Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          ok: false,
          operation: "auth",
          error: sessionError?.message || "Não autenticado",
          session: null,
        }),
        { 
          status: 401,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 2) Tentar INSERT (sem enviar user_id - deve usar DEFAULT/trigger)
    const testName = `Teste RLS ${Date.now()}`;
    const { data: insertedCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        name: testName,
        // ⚠️ NÃO enviar user_id - deve ser preenchido por DEFAULT ou trigger
      })
      .select("id, name, user_id, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({
          ok: false,
          operation: "insert",
          test_name: testName,
          error: insertError.message,
          error_details: insertError,
          session: {
            user_id: session.user.id,
            email: session.user.email,
          },
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 3) Verificar se user_id foi preenchido corretamente
    const userIdMatch = insertedCategory.user_id === session.user.id;

    // 4) Tentar SELECT (verificar se policy SELECT funciona)
    const { data: selectedCategory, error: selectError } = await supabase
      .from("categories")
      .select("id, name, user_id")
      .eq("id", insertedCategory.id)
      .single();

    // 5) Limpar (DELETE)
    await supabase
      .from("categories")
      .delete()
      .eq("id", insertedCategory.id);

    return new Response(
      JSON.stringify({
        ok: true,
        operation: "complete",
        test_name: testName,
        insert: {
          success: true,
          data: insertedCategory,
          user_id_match: userIdMatch,
        },
        select: {
          success: !selectError,
          data: selectedCategory,
          error: selectError?.message,
        },
        session: {
          user_id: session.user.id,
          email: session.user.email,
        },
        cleanup: {
          deleted: true,
        },
        summary: {
          rls_working: userIdMatch && !selectError,
          message: userIdMatch && !selectError
            ? "✅ RLS funcionando corretamente!"
            : "⚠️ RLS com problemas - verificar policies",
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
        operation: "exception",
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
 * GET - Listar todas as categorias do usuário logado
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
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

    // Listar categorias
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, user_id, created_at")
      .order("name");

    if (error) {
      return new Response(
        JSON.stringify({
          ok: false,
          operation: "select",
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
        session: {
          user_id: session.user.id,
          email: session.user.email,
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

