"use client";

import React, { Suspense } from 'react';

// ============================================================================
// Página de Login - NoCry Group (Client Component)
// ============================================================================
// Este é o componente client que contém o formulário de login.
// A página principal (page.tsx) é Server Component e faz o redirect se já logado.
// ============================================================================

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Loader2 } from 'lucide-react';
import Image from 'next/image';

// ============================================================================
// Schema de Validação (Zod)
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(5, 'Senha deve ter no mínimo 5 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// Componente de Conteúdo (usa useSearchParams)
// ============================================================================

function LoginContent() {
  const [supabase] = useState(() => createSupabaseBrowser());
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado para controle do modal "Esqueceu sua senha?"
  const [showForgotPasswordAlert, setShowForgotPasswordAlert] = useState(false);

  // React Hook Form com Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // ─────────────────────────────────────────────────────────────────────
  // Handler: Submit do formulário de login
  // ─────────────────────────────────────────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Mensagens de erro user-friendly
        let userMessage = error.message;

        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'E-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'E-mail ainda não confirmado.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        }

        setError('root', {
          type: 'manual',
          message: userMessage,
        });
        return;
      }

      // Sucesso: redireciona para `next` ou '/'
      if (authData.session) {
        const nextUrl = searchParams.get('next') || '/';
        router.push(nextUrl);
        router.refresh(); // Força refresh para atualizar sessão no server
      }
    } catch (err) {
      setError('root', {
        type: 'manual',
        message: 'Erro de conexão. Tente novamente.',
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Handler: "Esqueceu sua senha?"
  // ─────────────────────────────────────────────────────────────────────
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowForgotPasswordAlert(true);
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═════════════════════════════════════════════════════════════════════

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#000000] px-4 py-8">
      {/* ════════════════════════════════════════════════════════════════
          Header Visual: Logo + Frase
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col items-center mb-4">
        {/* Logo NoCry Group */}
        <div className="mb-4">
          <Image
            src="/logo-nocry.svg"
            alt="NoCry Group"
            width={330}
            height={150}
            priority
            className="h-50 w-auto"
          />
        </div>

        {/* Frase motivacional */}
        <p className="text-[#CACACA] text-center text-base max-w-md">
          Se o mundo é um teatro somos nós que criamos o roteiro
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Card de Login
          ════════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[420px] rounded-2xl border border-[#D4AF37] bg-[#161616] p-5 shadow-2xl">
        {/* Título */}
        <h1 className="text-center text-3xl text-[#D4AF37] mb-5">Login</h1>

        {/* Subtítulo */}
        <p className="text-center text-base text-[#CACACA] mb-6">
          Digite suas credenciais de NoCry Member
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* ──────────────────────────────────────────────────────────
              Campo: E-mail
              ────────────────────────────────────────────────────────── */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#CACACA] mb-2"
            >
              E-mail
            </label>
            <div className="relative">
              {/* Ícone dentro do input */}
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#D4AF37]" />

              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className={`w-full h-12 pl-10 pr-4 bg-transparent border rounded-lg text-[#CACACA] placeholder:text-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-0 transition-all ${
                  errors.email ? 'border-red-500' : 'border-[#CACACA]/30'
                }`}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-sm text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────
              Campo: Senha
              ────────────────────────────────────────────────────────── */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#CACACA] mb-2"
            >
              Senha
            </label>
            <div className="relative">
              {/* Ícone dentro do input */}
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#D4AF37]" />

              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Mínimo 5 caracteres"
                className={`w-full h-12 pl-10 pr-4 bg-transparent border rounded-lg text-[#CACACA] placeholder:text-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-0 transition-all ${
                  errors.password ? 'border-red-500' : 'border-[#CACACA]/30'
                }`}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────
              Link: "Esqueceu sua senha?"
              ────────────────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors mb-5"
            >
              Esqueceu sua senha?
            </button>
          </div>

          {/* ──────────────────────────────────────────────────────────
              Erro Geral do Formulário
              ────────────────────────────────────────────────────────── */}
          {errors.root && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-sm text-red-400">{errors.root.message}</p>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              Botão: Entrar
              ────────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#D4AF37] text-black font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#161616] disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-5"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Rodapé
          ════════════════════════════════════════════════════════════════ */}
      <footer className="mt-8 text-center">
        <p className="text-[#CACACA] text-sm">
          © 2025 NoCry Group • Todos os direitos reservados
        </p>
      </footer>

      {/* ════════════════════════════════════════════════════════════════
          Modal: "Esqueceu sua senha?"
          ════════════════════════════════════════════════════════════════ */}
      {showForgotPasswordAlert && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowForgotPasswordAlert(false)}
        >
          <div
            className="bg-[#161616] border border-[#D4AF37] rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#D4AF37] mb-3">
              Redefinição de Senha
            </h2>
            <p className="text-[#CACACA] text-sm mb-6">
              Entre em contato com o desenvolvedor para redefinição de senha.
            </p>
            <button
              onClick={() => setShowForgotPasswordAlert(false)}
              className="w-full h-10 bg-[#D4AF37] text-black font-semibold rounded-lg hover:brightness-95 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================================
// Componente Principal (wrapper com Suspense)
// ============================================================================

export default function LoginClientPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin mx-auto" />
          <p className="mt-4 text-[#CACACA] text-sm">Carregando...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}


