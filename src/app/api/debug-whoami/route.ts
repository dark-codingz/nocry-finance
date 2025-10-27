export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({
    ok: true,
    message: "Rota de teste funcionando!",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

