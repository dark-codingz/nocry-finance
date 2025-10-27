// ============================================================================
// Debug Page: Session Inspector
// ============================================================================
// Página para inspecionar sessão no servidor sem redirecionamentos
// USO: GET /_debug/session
// ============================================================================

import { cookies, headers } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DebugSessionPage() {
  const h = await headers();
  const cookieStore = await cookies();
  
  // Tentar obter sessão do Supabase
  let sessionInfo = null;
  let sessionError = null;
  
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
      sessionInfo = {
        user_id: session.user?.id,
        email: session.user?.email,
        expires_at: session.expires_at,
        token_length: session.access_token?.length,
      };
    }
    
    if (error) {
      sessionError = error.message;
    }
  } catch (err: any) {
    sessionError = err?.message || 'Erro desconhecido';
  }

  // Cookies do Supabase
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  );

  return (
    <div style={{ fontFamily: "monospace", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ color: "#D4AF37" }}>🔍 Debug: Session Inspector</h1>
      
      <div style={{ background: "#161616", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h2 style={{ color: "#D4AF37" }}>📡 Request Info</h2>
        <p><b>Host:</b> {h.get("host")}</p>
        <p><b>Proto:</b> {h.get("x-forwarded-proto")}</p>
        <p><b>Forwarded Host:</b> {h.get("x-forwarded-host")}</p>
        <p><b>User Agent:</b> {h.get("user-agent")}</p>
      </div>

      <div style={{ background: "#161616", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h2 style={{ color: "#D4AF37" }}>🍪 Supabase Cookies</h2>
        {supabaseCookies.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Nome</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {supabaseCookies.map(cookie => (
                <tr key={cookie.name} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 8 }}>{cookie.name}</td>
                  <td style={{ padding: 8 }}>{cookie.value.length} chars</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#ff6b6b" }}>❌ Nenhum cookie do Supabase encontrado!</p>
        )}
      </div>

      <div style={{ background: "#161616", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h2 style={{ color: "#D4AF37" }}>👤 Sessão Supabase</h2>
        {sessionError ? (
          <div>
            <p style={{ color: "#ff6b6b" }}>❌ Erro ao obter sessão: {sessionError}</p>
          </div>
        ) : sessionInfo ? (
          <div>
            <p style={{ color: "#51cf66" }}>✅ Sessão encontrada!</p>
            <pre style={{ background: "#000", padding: 12, borderRadius: 4, overflow: "auto" }}>
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>
        ) : (
          <p style={{ color: "#ffd43b" }}>⚠️ Nenhuma sessão ativa</p>
        )}
      </div>

      <details style={{ background: "#161616", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", color: "#D4AF37", fontSize: 18 }}>
          📋 Todos os Headers
        </summary>
        <pre style={{ background: "#000", padding: 12, borderRadius: 4, overflow: "auto", marginTop: 8 }}>
          {JSON.stringify(Object.fromEntries(h.entries()), null, 2)}
        </pre>
      </details>

      <details style={{ background: "#161616", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", color: "#D4AF37", fontSize: 18 }}>
          🍪 Todos os Cookies
        </summary>
        <pre style={{ background: "#000", padding: 12, borderRadius: 4, overflow: "auto", marginTop: 8 }}>
          {JSON.stringify(allCookies.map(x => ({ name: x.name, length: x.value.length })), null, 2)}
        </pre>
      </details>

      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, border: "1px solid #333" }}>
        <h3 style={{ color: "#ffd43b" }}>💡 Diagnóstico de Problemas Comuns:</h3>
        <ul style={{ lineHeight: 1.8 }}>
          <li>
            <b>Cookie não aparece?</b>
            <ul>
              <li>Verifique <code>Domain</code> do cookie (deve ser compatível com www/apex)</li>
              <li>Confira <code>sameSite</code> (use <code>lax</code> para OAuth)</li>
              <li>Garanta <code>secure: true</code> em produção (HTTPS)</li>
              <li>Verifique <code>path</code> do cookie (default: /)</li>
            </ul>
          </li>
          <li>
            <b>Loop de redirecionamento?</b>
            <ul>
              <li>Middleware pode estar redirecionando mesmo com sessão válida</li>
              <li>Verificar se middleware e página protegida não fazem redirect duplo</li>
              <li>Confirmar que URLs de callback OAuth estão corretas</li>
            </ul>
          </li>
          <li>
            <b>Sessão expira muito rápido?</b>
            <ul>
              <li>Verificar configuração de <code>expires_at</code> do Supabase</li>
              <li>Conferir se refresh token está funcionando</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}

