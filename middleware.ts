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
    // Tudo, menos /api, /_next/static, /_next/image, /favicon.ico
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
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
  if (pathname.startsWith('/_debug') || 
      pathname.startsWith('/api/_debug') || 
      searchParams.get('debug') === '1') {
    console.log('[MW] 🔧 DEBUG BYPASS:', pathname);
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────────────
  // LOG: Confirmar execução no terminal
  // ─────────────────────────────────────────────────────────────────────
  console.log('[MW] 🔍 hit:', pathname);

  // ─────────────────────────────────────────────────────────────────────
  // Identificar rotas públicas (não exigem auth no middleware)
  // ─────────────────────────────────────────────────────────────────────
  const isLogin = pathname === '/login';
  const isOnboarding = pathname === '/onboarding';
  const isPublicRoute = isLogin || isOnboarding;
  const res = NextResponse.next();

  // ─────────────────────────────────────────────────────────────────────
  // Criar cliente Supabase na middleware (usa cookies/sign/refresh)
  // ─────────────────────────────────────────────────────────────────────
  const supabase = createMiddlewareClient({ req, res });

  // Obter sessão atual
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
  // REGRA 1: Usuário LOGADO tentando acessar /login → manda para /
  // NOTA: Evitar loop - só redireciona se NÃO vier de um redirect anterior
  // ─────────────────────────────────────────────────────────────────────
  if (isLogin && isLogged) {
    const referer = req.headers.get('referer');
    const isFromRedirect = referer?.includes('/login');
    
    // Evita loop: se já veio do /login, não redireciona novamente
    if (!isFromRedirect) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      console.log('[MW] ↩️  redirect: /login -> / (já logado)');
      return NextResponse.redirect(url);
    } else {
      console.log('[MW] ⚠️  LOOP DETECTADO - permitindo acesso ao /login para evitar loop infinito');
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // REGRA 2: Usuário NÃO LOGADO em rota privada → manda para /login?next=<rota>
  // NOTA: /login e /onboarding são públicas, mas /onboarding exige auth internamente
  // ─────────────────────────────────────────────────────────────────────
  if (!isPublicRoute && !isLogged) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const nextParam = pathname + (search || '');
    url.searchParams.set('next', nextParam);
    console.log('[MW] 🚫 redirect: anon -> /login?next=', nextParam);
    return NextResponse.redirect(url);
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASO NORMAL: Seguir com a requisição
  // ─────────────────────────────────────────────────────────────────────
  console.log('[MW] ✅ allow:', pathname);
  return res;
}
