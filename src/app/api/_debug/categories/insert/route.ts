import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rota de Debug - Testar INSERT de categoria
 * 
 * Testa se:
 * 1. Usuário está autenticado
 * 2. INSERT funciona com DEFAULT auth.uid()
 * 3. user_id é preenchido automaticamente
 * 4. RLS permite a operação
 * 
 * Uso: POST /api/_debug/categories/insert
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServer();

    // 1) Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          ok: false,
          step: "auth",
          error: authError?.message || "Não autenticado",
        }),
        { 
          status: 401,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 2) Tentar INSERT (SEM enviar user_id - DEFAULT deve preencher)
    const testName = `Debug ${Date.now()}`;
    const { data: insertedCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        name: testName,
        type: "expense",
        archived: false,
        // ⚠️ NÃO enviar user_id - DEFAULT auth.uid() preenche
      })
      .select("id, name, type, user_id, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({
          ok: false,
          step: "insert",
          test_name: testName,
          error: insertError.message,
          error_code: insertError.code,
          error_details: insertError.details,
          user: {
            id: user.id,
            email: user.email,
          },
        }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // 3) Verificar se user_id foi preenchido corretamente
    const userIdMatch = insertedCategory.user_id === user.id;

    // 4) Limpar (DELETE)
    await supabase
      .from("categories")
      .delete()
      .eq("id", insertedCategory.id);

    return new Response(
      JSON.stringify({
        ok: true,
        step: "complete",
        test_name: testName,
        insert: {
          success: true,
          data: insertedCategory,
          user_id_match: userIdMatch,
        },
        user: {
          id: user.id,
          email: user.email,
        },
        cleanup: {
          deleted: true,
        },
        summary: {
          default_working: userIdMatch,
          message: userIdMatch
            ? "✅ DEFAULT auth.uid() funcionando!"
            : "⚠️ user_id não corresponde ao usuário logado",
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
        step: "exception",
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
 * GET - Listar categorias do usuário
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

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

