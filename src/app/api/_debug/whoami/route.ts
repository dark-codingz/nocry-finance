// ============================================================================
// Debug Route: Whoami
// ============================================================================
// Retorna informações sobre headers e cookies para debug de sessão
// USO: GET /api/_debug/whoami
// ============================================================================

import { headers, cookies } from "next/headers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const cookieStore = await cookies();

  // Liste cookies de forma segura (só nomes/len)
  const allCookies = [];
  for (const cName of cookieStore.getAll().map(x => x.name)) {
    const v = cookieStore.get(cName)?.value ?? "";
    allCookies.push({ name: cName, length: v.length });
  }

  const info = {
    host: h.get("host"),
    proto: h.get("x-forwarded-proto"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedFor: h.get("x-forwarded-for"),
    forwardedPort: h.get("x-forwarded-port"),
    userAgent: h.get("user-agent"),
    referer: h.get("referer"),
    cookieCount: allCookies.length,
    cookies: allCookies,
    now: new Date().toISOString(),
  };

  return new Response(JSON.stringify(info, null, 2), {
    status: 200,
    headers: { 
      "content-type": "application/json",
      "cache-control": "no-store, must-revalidate"
    },
  });
}

