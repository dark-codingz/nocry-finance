import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rota de Teste Completo - Categories RLS
 * 
 * Testa todo o fluxo:
 * 1. Autenticação (getUser)
 * 2. Debug whoami (RPC)
 * 3. INSERT (sem enviar user_id)
 * 4. Verificar user_id preenchido
 * 5. SELECT (RLS)
 * 6. UPDATE (RLS)
 * 7. DELETE (cleanup)
 * 
 * Uso: POST /api/_debug/categories/test
 */
export async function POST() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: {},
  };

  try {
    const supabase = await createSupabaseServer();

    // STEP 1: Autenticação
    results.steps.auth = { step: 1, name: "Autenticação" };
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      results.steps.auth.error = authError?.message || "No user";
      results.steps.auth.success = false;
      results.final_result = "❌ FALHOU: Usuário não autenticado";
      
      return new Response(JSON.stringify(results), { 
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }
    
    results.steps.auth.success = true;
    results.steps.auth.user_id = user.id;
    results.steps.auth.email = user.email;

    // STEP 2: Debug whoami
    results.steps.whoami = { step: 2, name: "Debug whoami (RPC)" };
    const { data: whoamiData, error: whoamiError } = await supabase.rpc("debug_whoami");
    
    if (whoamiError) {
      results.steps.whoami.error = whoamiError.message;
      results.steps.whoami.success = false;
    } else {
      results.steps.whoami.success = true;
      results.steps.whoami.data = whoamiData;
      results.steps.whoami.uid_match = whoamiData?.uid === user.id;
    }

    // STEP 3: INSERT (sem enviar user_id - DEFAULT deve preencher)
    results.steps.insert = { step: 3, name: "INSERT categoria" };
    const testName = `Test RLS ${Date.now()}`;
    
    const { data: insertedCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        name: testName,
        type: "expense",
        archived: false,
        // ⚠️ NÃO enviar user_id
      })
      .select("id, name, type, user_id, created_at")
      .single();

    if (insertError) {
      results.steps.insert.error = insertError.message;
      results.steps.insert.error_code = insertError.code;
      results.steps.insert.error_details = insertError.details;
      results.steps.insert.success = false;
      results.final_result = `❌ FALHOU: INSERT - ${insertError.message}`;
      
      return new Response(JSON.stringify(results), { 
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    results.steps.insert.success = true;
    results.steps.insert.data = insertedCategory;
    results.steps.insert.user_id_match = insertedCategory.user_id === user.id;

    // STEP 4: SELECT (RLS deve permitir)
    results.steps.select = { step: 4, name: "SELECT categoria" };
    const { data: selectedCategory, error: selectError } = await supabase
      .from("categories")
      .select("id, name, type, user_id")
      .eq("id", insertedCategory.id)
      .single();

    if (selectError) {
      results.steps.select.error = selectError.message;
      results.steps.select.success = false;
    } else {
      results.steps.select.success = true;
      results.steps.select.data = selectedCategory;
    }

    // STEP 5: UPDATE (RLS deve permitir)
    results.steps.update = { step: 5, name: "UPDATE categoria" };
    const newName = `${testName} - Updated`;
    
    const { data: updatedCategory, error: updateError } = await supabase
      .from("categories")
      .update({ name: newName })
      .eq("id", insertedCategory.id)
      .select("id, name")
      .single();

    if (updateError) {
      results.steps.update.error = updateError.message;
      results.steps.update.success = false;
    } else {
      results.steps.update.success = true;
      results.steps.update.data = updatedCategory;
      results.steps.update.name_updated = updatedCategory?.name === newName;
    }

    // STEP 6: DELETE (cleanup)
    results.steps.delete = { step: 6, name: "DELETE categoria (cleanup)" };
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", insertedCategory.id);

    if (deleteError) {
      results.steps.delete.error = deleteError.message;
      results.steps.delete.success = false;
    } else {
      results.steps.delete.success = true;
    }

    // RESULTADO FINAL
    const allSuccess = Object.values(results.steps).every((s: any) => s.success !== false);
    results.final_result = allSuccess 
      ? "✅ ✅ ✅  TODOS OS TESTES PASSARAM! RLS funcionando perfeitamente."
      : "⚠️  Alguns testes falharam. Veja os detalhes acima.";

    results.summary = {
      auth: results.steps.auth.success,
      whoami: results.steps.whoami.success,
      insert: results.steps.insert.success,
      select: results.steps.select.success,
      update: results.steps.update.success,
      delete: results.steps.delete.success,
      user_id_match: results.steps.insert.user_id_match,
      rls_working: allSuccess,
    };

    return new Response(JSON.stringify(results, null, 2), { 
      status: allSuccess ? 200 : 400,
      headers: { "content-type": "application/json" }
    });

  } catch (error: any) {
    results.exception = {
      message: error?.message || String(error),
      stack: error?.stack,
    };
    results.final_result = `❌ EXCEPTION: ${error?.message}`;
    
    return new Response(JSON.stringify(results, null, 2), { 
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

