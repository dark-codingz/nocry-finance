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
  
  return <LoginClientPage />;
}
