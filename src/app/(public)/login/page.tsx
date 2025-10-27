import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/lib/auth/guard";
import LoginClientPage from "./page-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Página de Login (Server Component)
 * 
 * ESTRATÉGIA ANTI-LOOP:
 * - Esta página faz redirect APENAS se já estiver logado
 * - O layout protegido faz redirect APENAS se NÃO estiver logado
 * - Resultado: sem ping-pong entre / e /login
 */
export default async function LoginPage() {
  const { user, source, errorReason } = await serverAuthGuard();

  // ÚNICO REDIRECT: Se já estiver logado, vai para /
  if (user) {
    console.log("[LoginPage] ✅ Usuário já logado, redirect para /");
    redirect("/");
  }

  // Não está logado: renderiza formulário de login
  console.log("[LoginPage] 🔐 Usuário NÃO logado, renderizando form");
  
  return (
    <>
      {/* Banner de debug (remover depois) */}
      <div style={{fontFamily:"monospace",fontSize:11,background:"#333",color:"#ff0",padding:6,position:"fixed",bottom:0,left:0,right:0,zIndex:9999}}>
        <b>/login debug</b> • user: {user ? "yes" : "no"} • via: {source} • err: {errorReason ?? "-"}
      </div>
      
      <LoginClientPage />
    </>
  );
}
