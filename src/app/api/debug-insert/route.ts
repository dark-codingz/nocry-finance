import { headers } from "next/headers";
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
  const h = headers();
  const supabase = createServerClient(URL, KEY, {
    headers: { get: (n: string) => h.get(n) ?? undefined },
  });

  const who = await supabase.rpc("debug_whoami").catch((e) => ({ data: null, error: e?.message }));
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return new Response(JSON.stringify({ ok: false, step: "auth", whoami: who?.data ?? null, error: "Não autenticado" }, null, 2),
      { status: 401, headers: { "content-type": "application/json" } });
  }
  if (!name || !type) {
    return new Response(JSON.stringify({ ok: false, step: "validate", error: "name e type são obrigatórios" }, null, 2),
      { status: 400, headers: { "content-type": "application/json" } });
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, type }) // DEFAULT preenche user_id
    .select("id,name,type,user_id")
    .single();

  const status = error ? 400 : 201;
  return new Response(JSON.stringify({
    ok: !error, whoami: who?.data ?? null, user: userData.user,
    sent: { name, type }, data, error: error?.message ?? null
  }, null, 2), { status, headers: { "content-type": "application/json" } });
}

