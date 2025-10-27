import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const h = headers();
  const supabase = createServerClient(URL, KEY, {
    headers: { get: (n: string) => h.get(n) ?? undefined },
  });

  const who = await supabase.rpc("debug_whoami").catch((e) => ({ data: null, error: e?.message }));
  const { data: userData, error: uErr } = await supabase.auth.getUser();

  return new Response(JSON.stringify({
    whoami: who?.data ?? null,
    getUserErr: uErr?.message ?? null,
    user: userData?.user ?? null
  }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
}

