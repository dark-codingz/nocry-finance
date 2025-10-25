// ============================================================================
// API Route: Revalidação de Cache (Server Components)
// ============================================================================
// PROPÓSITO:
// - Forçar revalidação de Server Components após mudanças importantes
// - Usado após onboarding, mudança de orçamento, etc.
// - Revalida a home (Dashboard) para refletir novos dados
// ============================================================================

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/revalidate
 * 
 * Revalida o cache de Server Components para a home (Dashboard).
 * 
 * @example
 * ```ts
 * fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
 * ```
 */
export async function POST() {
  try {
    // Revalidar página principal (Dashboard)
    revalidatePath('/');
    
    // Opcional: revalidar outras páginas relevantes
    revalidatePath('/carteira');
    revalidatePath('/emprestimos');
    
    return NextResponse.json({ 
      ok: true, 
      revalidated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Revalidate API] Erro:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao revalidar cache' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revalidate
 * 
 * Retorna informações sobre a API (documentação).
 */
export async function GET() {
  return NextResponse.json({
    name: 'Revalidate API',
    description: 'Revalida cache de Server Components',
    method: 'POST',
    usage: 'fetch(\'/api/revalidate\', { method: \'POST\' })',
  });
}



