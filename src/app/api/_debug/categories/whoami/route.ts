import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });

  let whoamiData = null;
  let whoamiError = null;
  try {
    const { data, error } = await supabase.rpc("debug_whoami");
    whoamiData = data;
    whoamiError = error?.message ?? null;
  } catch (e: any) {
    whoamiError = e?.message || String(e);
  }

  const { data: userData, error: uErr } = await supabase.auth.getUser();

  return new Response(JSON.stringify({
    whoami: { data: whoamiData, error: whoamiError },
    getUserErr: uErr?.message ?? null,
    user: userData?.user ?? null
  }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
}

