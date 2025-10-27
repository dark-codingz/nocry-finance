import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const h = await headers();
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return h.get('cookie')?.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1];
      },
      set() {},
      remove() {},
    },
  });

  const who = await supabase.rpc("debug_whoami").catch((e) => ({ data: null, error: e?.message }));
  const { data: userData, error: uErr } = await supabase.auth.getUser();

  return new Response(
    JSON.stringify(
      { whoami: who?.data ?? null, getUserErr: uErr?.message ?? null, user: userData?.user ?? null },
      null,
      2
    ),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

