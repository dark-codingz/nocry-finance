"use client";

// ============================================================================
// AdminClient - Interface de Administração (Client Component)
// ============================================================================
// Propósito: Renderizar a UI de criação de usuários e interagir com a API.
//
// NOTA: Este é um Client Component separado para permitir que o parent
// (page.tsx) seja um Server Component que valida whitelist no servidor.
// ============================================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ============================================================================
// Schema de Validação
// ============================================================================

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  username: z.string().optional(), // Nome de usuário (opcional)
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

// ============================================================================
// Tipos
// ============================================================================

interface CreatedUser {
  id: string;
  email: string;
  createdAt: string;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface AdminClientProps {
  userEmail: string;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function AdminClient({ userEmail }: AdminClientProps) {
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [remainingCreations, setRemainingCreations] = useState<number | null>(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  // ─────────────────────────────────────────────────────────────────────
  // Toast auto-dismiss (5 segundos)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─────────────────────────────────────────────────────────────────────
  // Handler: Criar usuário via API
  // ─────────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CreateUserFormData) => {
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError('root', {
          type: 'manual',
          message: result.error || 'Erro ao criar usuário',
        });
        setToast({ type: 'error', message: result.error || 'Erro ao criar usuário' });
        return;
      }

      // Sucesso
      setToast({
        type: 'success',
        message: `Usuário ${data.username || data.email} criado com sucesso!`,
      });

      // Adiciona à lista de criados
      setCreatedUsers((prev) => [
        {
          id: result.userId,
          email: data.email,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Atualiza contador de rate limit
      if (result.remaining !== undefined) {
        setRemainingCreations(result.remaining);
      }

      // Limpa o formulário
      reset();
    } catch (err) {
      setToast({ type: 'error', message: 'Erro de conexão. Tente novamente.' });
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═════════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Administração</h1>
          <p className="text-gray-600 mt-2">Criar e gerenciar usuários do sistema</p>
          <p className="text-xs text-gray-500 mt-1">
            Logado como: <span className="font-mono">{userEmail}</span>
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-md ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card: Formulário de Criação */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Criar Novo Usuário</h2>

            {/* Rate Limit Counter */}
            {remainingCreations !== null && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Criações restantes nesta hora:</strong> {remainingCreations}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="usuario@exemplo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Username (opcional) */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de usuário <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: joao123"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Será exibido no dashboard. Se não preenchido, usará o email.
                </p>
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Erro Geral */}
              {errors.root && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{errors.root.message}</p>
                </div>
              )}

              {/* Botão Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Criando...
                  </span>
                ) : (
                  'Criar Usuário'
                )}
              </button>
            </form>
          </div>

          {/* Card: Lista de Usuários Criados */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Usuários Criados Recentemente
            </h2>

            {createdUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="mt-2">Nenhum usuário criado nesta sessão ainda.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {createdUsers.map((user) => (
                  <li
                    key={user.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Criado
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 space-y-4">
          {/* Aviso sobre Auto-Registro */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Não Existe Auto-Registro</h3>
            <p className="text-sm text-blue-700">
              O sistema <strong>NÃO</strong> possui página pública de cadastro. Todas as contas devem ser criadas
              manualmente aqui por você (administrador) e as credenciais devem ser enviadas aos usuários
              de forma segura (email, mensagem privada, etc.).
            </p>
          </div>

          {/* Informações de Segurança */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Informações de Segurança</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Apenas emails na whitelist podem acessar esta página</li>
              <li>• A verificação final é feita no servidor (API route + layout)</li>
              <li>• Limite de 10 criações por hora por administrador</li>
              <li>• Usuários são criados com email confirmado automaticamente</li>
              <li>• A SERVICE_ROLE_KEY nunca é exposta ao cliente</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}


