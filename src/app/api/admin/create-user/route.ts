// /src/app/api/admin/create-user/route.ts

// ============================================================================
// API Route: Criação de Usuários Admin (Assíncrono)
// ============================================================================
// Propósito: Permitir que administradores criem novos usuários no sistema.
//
// SEGURANÇA CRÍTICA:
// - Esta rota usa a SERVICE_ROLE_KEY do Supabase, que bypassa TODAS as
//   políticas de RLS e tem acesso administrativo total ao banco de dados.
// - NUNCA exponha esta chave no cliente (sem NEXT_PUBLIC_ no nome da variável).
// - Apenas emails na whitelist podem acessar esta rota.
// - A rota roda APENAS no servidor (runtime Node.js, não Edge).
//
// FLUXO:
// 1. Verifica se há uma sessão ativa (usuário logado)
// 2. Confere se o email do usuário está na ADMIN_WHITELIST
// 3. Valida o body da requisição (email + password)
// 4. Cria o usuário usando a Admin API do Supabase
// 5. Retorna sucesso com o userId ou erro detalhado
//
// MUDANÇAS (Async Cookies):
// - `await cookies()` é obrigatório no Next.js App Router
// - `createRouteHandlerClient` recebe uma função que retorna cookieStore
// - Runtime Node.js garantido para acessar variáveis de ambiente server-only
// ============================================================================

// Força execução no runtime Node.js (não Edge)
export const runtime = 'nodejs';
// Força rota sempre dinâmica (não cacheia)
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// ============================================================================
// Configurações e Constantes
// ============================================================================

// Whitelist de administradores (normalizada)
const EMAIL_WHITELIST = (process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Variáveis de ambiente do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Schema de validação do body
const BodySchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  username: z.string().optional(), // Nome de usuário (opcional)
  displayName: z.string().optional(), // Nome para exibição (opcional)
});

// ============================================================================
// Rate Limiting em Memória (Simples)
// ============================================================================
// NOTA: Em produção, considere usar Redis ou similar para rate limiting
// distribuído entre múltiplas instâncias do servidor.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_CREATIONS_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(email: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  // Se não existe ou já expirou, cria nova entrada
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true, remaining: MAX_CREATIONS_PER_HOUR - 1 };
  }

  // Se excedeu o limite
  if (entry.count >= MAX_CREATIONS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  // Incrementa contador
  entry.count++;
  return { allowed: true, remaining: MAX_CREATIONS_PER_HOUR - entry.count };
}

// Limpeza periódica do Map (evita memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, ONE_HOUR_MS);

// ============================================================================
// Handler POST
// ============================================================================

export async function POST(req: Request) {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. Verificar sessão do usuário (quem está fazendo a requisição)
    // ─────────────────────────────────────────────────────────────────────
    const supabase = createRouteHandlerClient({ 
      cookies
    });

    // Busca o usuário autenticado
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError) {
      console.warn('[Admin API] Erro ao obter usuário:', getUserError.message);
      return NextResponse.json(
        { ok: false, error: 'Erro ao verificar autenticação.' },
        { status: 401 }
      );
    }

    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      );
    }

    const requesterEmail = user.email.toLowerCase();

    // ─────────────────────────────────────────────────────────────────────
    // 2. Verificar se o usuário está na whitelist de admins
    // ─────────────────────────────────────────────────────────────────────
    const isAdmin = EMAIL_WHITELIST.includes(requesterEmail);

    if (!isAdmin) {
      console.warn(`[Admin API] Tentativa de acesso negada para: ${requesterEmail}`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Acesso restrito. Você não tem permissão para criar usuários.',
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Rate Limiting (proteção contra abuso)
    // ─────────────────────────────────────────────────────────────────────
    const rateLimitCheck = checkRateLimit(requesterEmail);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Limite de criações excedido. Você pode criar no máximo ${MAX_CREATIONS_PER_HOUR} usuários por hora. Tente novamente mais tarde.`,
        },
        { status: 429 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Validar body da requisição
    // ─────────────────────────────────────────────────────────────────────
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json(
        { 
          ok: false, 
          error: `Dados inválidos: ${errors}`,
          issues: parsed.error.issues 
        },
        { status: 400 }
      );
    }

    const { email, password, username, displayName } = parsed.data;

    // ─────────────────────────────────────────────────────────────────────
    // 5. Verificar configuração do servidor
    // ─────────────────────────────────────────────────────────────────────
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('[Admin API] Variáveis de ambiente não configuradas!');
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Configuração do servidor ausente. Contate o administrador.' 
        },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. Criar usuário usando Admin API (Service Role)
    // ─────────────────────────────────────────────────────────────────────
    const admin = createSupabaseAdmin(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma o email (para desenvolvimento)
      user_metadata: {
        created_by: requesterEmail,
        created_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('[Admin API] Erro ao criar usuário:', error);

      // Traduzir erros comuns do Supabase
      let userMessage = error.message;
      if (error.message.includes('already registered')) {
        userMessage = 'Este email já está cadastrado no sistema.';
      } else if (error.message.includes('invalid email')) {
        userMessage = 'Email inválido.';
      } else if (error.message.includes('password')) {
        userMessage = 'Senha muito fraca ou inválida.';
      }

      return NextResponse.json(
        { ok: false, error: userMessage },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. Criar perfil com dados iniciais (full_name + display_name)
    // ─────────────────────────────────────────────────────────────────────
    const newUserId = data.user?.id;
    if (newUserId) {
      console.log('[Admin API] Criando profile para userId:', newUserId);
      
      // Definir nome padrão (displayName ou parte do email)
      const defaultName = displayName?.trim() || email.split('@')[0];
      
      // Preparar payload do profile
      const profilePayload: any = {
        id: newUserId,
        full_name: defaultName,      // ← Nome completo
        display_name: defaultName,    // ← Nome para exibição
        onboarding_done: false,       // ← Precisa fazer onboarding
      };

      // Adicionar username se fornecido (mantém compatibilidade)
      if (username && username.trim()) {
        profilePayload.username = username.trim();
      }

      console.log('[Admin API] Profile payload:', JSON.stringify(profilePayload));

      const { error: profileError } = await admin
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        console.error('[Admin API] Erro ao criar perfil:', profileError);
        console.error('[Admin API] Profile error details:', JSON.stringify(profileError, null, 2));
        
        // Não falha a criação do usuário, apenas retorna warning
        return NextResponse.json(
          {
            ok: true,
            userId: newUserId,
            email: data.user?.email,
            displayName: defaultName,
            message: 'Usuário criado, mas falhou ao criar perfil.',
            warning: profileError.message || 'Perfil não foi criado.',
            remaining: rateLimitCheck.remaining,
          },
          { status: 200 }
        );
      }
      
      console.log('[Admin API] Profile criado com sucesso:', defaultName);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 8. Sucesso - retornar dados do usuário criado
    // ─────────────────────────────────────────────────────────────────────
    const finalDisplayName = displayName?.trim() || email.split('@')[0];
    
    console.log(
      `[Admin API] Usuário criado com sucesso por ${requesterEmail}: ${email} (ID: ${newUserId}) - Nome: ${finalDisplayName}`
    );

    return NextResponse.json(
      {
        ok: true,
        userId: newUserId ?? null,
        email: data.user?.email,
        displayName: finalDisplayName,
        username: username ?? null,
        message: 'Usuário criado com sucesso!',
        remaining: rateLimitCheck.remaining,
      },
      { status: 200 }
    );
  } catch (err: any) {
    // Erro inesperado (ex: network, banco de dados)
    console.error('[Admin API] ❌ ERRO INTERNO CAPTURADO:', err);
    console.error('[Admin API] ❌ Erro message:', err?.message);
    console.error('[Admin API] ❌ Erro stack:', err?.stack);
    console.error('[Admin API] ❌ Erro completo:', JSON.stringify(err, null, 2));
    
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Erro interno do servidor. Tente novamente mais tarde.',
        details: err?.message || 'Erro desconhecido'  // Para debug
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Handler GET (opcional - para debug/teste)
// ============================================================================

export async function GET() {
  return NextResponse.json(
    {
      message: 'Admin API - Create User Endpoint',
      method: 'POST',
      requiredBody: {
        email: 'string (valid email)',
        password: 'string (min 6 characters)',
      },
      security: {
        authentication: 'Required (must be logged in)',
        authorization: 'Email must be in ADMIN_WHITELIST',
        rateLimit: `${MAX_CREATIONS_PER_HOUR} creations per hour per admin`,
      },
      docs: 'Send POST request with JSON body { email, password }',
    },
    { status: 200 }
  );
}
