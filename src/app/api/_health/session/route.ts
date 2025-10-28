// ============================================================================
// Health Check - Session Endpoint
// ============================================================================
// Propósito: Verificar se a leitura de cookies e sessão está funcionando
// corretamente no ambiente de produção (Vercel).
//
// USO:
// GET /api/_health/session
//
// RESPOSTA:
// {
//   "ok": true,
//   "authenticated": boolean,
//   "user_id": string | null,
//   "timestamp": string
// }
// ============================================================================

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Força runtime Node.js para garantir compatibilidade com cookies
export const runtime = 'nodejs';

// Desabilita cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. Criar cliente Supabase com cookies
    // ─────────────────────────────────────────────────────────────────────
    const supabase = createServerComponentClient({ cookies });

    // ─────────────────────────────────────────────────────────────────────
    // 2. Verificar sessão
    // ─────────────────────────────────────────────────────────────────────
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // ─────────────────────────────────────────────────────────────────────
    // 3. Retornar status
    // ─────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        ok: true,
        authenticated: !!session,
        user_id: session?.user?.id ?? null,
        timestamp: new Date().toISOString(),
        error: error?.message ?? null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    // ─────────────────────────────────────────────────────────────────────
    // 4. Erro ao processar
    // ─────────────────────────────────────────────────────────────────────
    console.error('[Health Check] Erro:', err);
    
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}


