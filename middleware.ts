// middleware.ts (na RAIZ do projeto - mesmo nível de package.json)

// ============================================================================
// Middleware de Autenticação - NoCry Finance
// ============================================================================
// Propósito: Proteger rotas e gerenciar navegação baseado na sessão.
//
// REGRAS:
// 1. Usuário logado tentando acessar /login → redireciona para /
// 2. Usuário NÃO logado em qualquer rota (exceto /login) → redireciona para /login?next=<rota>
// 3. Rotas sempre liberadas: /api/*, /_next/*, arquivos estáticos
//
// LOGS: Todos os acessos são logados no terminal para debug
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// ============================================================================
// Configuração do Matcher
// ============================================================================
// ⚠️ Catch-all matcher: executa em todas as rotas de pages/app,
// exceto APIs, assets do Next e favicon.
export const config = {
  matcher: [
    // Tudo, menos /api, /_next/static, /_next/image, /favicon.ico, /debug
    '/((?!api|_next/static|_next/image|favicon.ico|debug).*)',
  ],
};

// ============================================================================
// Middleware Principal
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;

  // ─────────────────────────────────────────────────────────────────────
  // BYPASS para rotas de debug (evita loops e permite inspeção)
  // ─────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/debug') || 
      pathname.startsWith('/_debug') ||
      pathname.startsWith('/api/_debug') ||
      pathname.startsWith('/api/_health') ||
      searchParams.get('debug') === '1') {
    console.log('[MW] 🔧 DEBUG BYPASS:', pathname);
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────────────
  // LOG: Confirmar execução no terminal
  // ─────────────────────────────────────────────────────────────────────
  console.log('[MW] 🔍 hit:', pathname);

  // ─────────────────────────────────────────────────────────────────────
  // ⚠️ REDIRECTS TEMPORARIAMENTE DESATIVADOS (para debug de loop)
  // ─────────────────────────────────────────────────────────────────────
  // A autenticação está sendo feita no layout protegido via serverAuthGuard()
  // O middleware apenas atualiza a sessão (refresh token se necessário)
  // ─────────────────────────────────────────────────────────────────────
  
  const res = NextResponse.next();

  // ─────────────────────────────────────────────────────────────────────
  // Criar cliente Supabase na middleware (atualiza cookies/refresh token)
  // ─────────────────────────────────────────────────────────────────────
  const supabase = createMiddlewareClient({ req, res });

  // Obter sessão atual (isso força refresh do token se necessário)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.warn('[MW] ⚠️  getSession error:', error.message);
  }

  const isLogged = !!session?.user?.id;
  console.log('[MW] 🔐 logged?', isLogged, '| path:', pathname);

  // ─────────────────────────────────────────────────────────────────────
  // NOTA: Redirects estão DESATIVADOS no middleware.
  // A proteção de rotas é feita no layout server-side via serverAuthGuard().
  // Isso evita loops de redirect entre middleware e layout.
  // ─────────────────────────────────────────────────────────────────────

  console.log('[MW] ✅ allow (no redirects):', pathname);
  return res;
}
