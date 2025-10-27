import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Página de Debug - Inspeção de Headers
 * 
 * Mostra todos os headers da requisição para debug de redirects/loops.
 * Acesse: http://localhost:3000/_debug/where ou https://theresnocry.com/_debug/where
 */
export default async function WherePage() {
  const h = await headers();
  
  const headersObj = Object.fromEntries(h.entries());
  
  return (
    <div style={{ fontFamily: "monospace", padding: 24, background: "#000", color: "#0f0", minHeight: "100vh" }}>
      <h1 style={{ color: "#D4AF37", marginBottom: 24 }}>🔍 Debug: Where Am I?</h1>
      
      <div style={{ background: "#111", padding: 16, borderRadius: 8, border: "1px solid #D4AF37" }}>
        <h2 style={{ color: "#D4AF37", marginBottom: 16 }}>Headers da Requisição:</h2>
        <pre style={{ overflow: "auto", fontSize: 12 }}>
          {JSON.stringify(headersObj, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "#111", borderRadius: 8, border: "1px solid #0ff" }}>
        <h2 style={{ color: "#0ff", marginBottom: 16 }}>Informações Úteis:</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.8 }}>
          <li><b>Host:</b> {h.get("host") || "N/A"}</li>
          <li><b>X-Forwarded-Proto:</b> {h.get("x-forwarded-proto") || "N/A"}</li>
          <li><b>X-Forwarded-Host:</b> {h.get("x-forwarded-host") || "N/A"}</li>
          <li><b>X-Forwarded-For:</b> {h.get("x-forwarded-for") || "N/A"}</li>
          <li><b>Referer:</b> {h.get("referer") || "N/A"}</li>
          <li><b>User-Agent:</b> {h.get("user-agent") || "N/A"}</li>
        </ul>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "#161616", borderRadius: 8 }}>
        <p style={{ fontSize: 14, color: "#CACACA" }}>
          Esta página faz parte do sistema de debug do NoCry Finance.<br />
          Para voltar ao dashboard, <a href="/" style={{ color: "#D4AF37", textDecoration: "underline" }}>clique aqui</a>.
        </p>
      </div>
    </div>
  );
}

