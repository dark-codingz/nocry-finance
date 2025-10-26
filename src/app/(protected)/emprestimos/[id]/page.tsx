// /app/emprestimos/[id]/page.tsx
"use client";

// ============================================================================
// Página de Detalhes do Empréstimo
// ============================================================================
// Exibe o timeline de eventos e permite adicionar novos eventos.
// Valores monetários sempre em centavos (number).
// ============================================================================

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatBRL } from '@/lib/money';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import * as loansService from '@/services/loans';

// ============================================================================
// Tipos Locais
// ============================================================================

const LOAN_EVENT_TYPES = ['principal', 'payment', 'interest', 'interest_payment'] as const;
type LoanEventType = typeof LOAN_EVENT_TYPES[number];

// ============================================================================
// Função de Agregação
// ============================================================================

type Aggregates = {
  borrowedCents: number;
  paidCents: number;
  interestCents: number;
  remainingCents: number;
};

function computeAggregates(events: Array<{ type: LoanEventType; amount_cents: number }>): Aggregates {
  let borrowed = 0, paid = 0, interest = 0;
  for (const ev of events) {
    if (ev.type === 'principal') borrowed += ev.amount_cents;
    else if (ev.type === 'payment' || ev.type === 'interest_payment') paid += ev.amount_cents;
    else if (ev.type === 'interest') interest += ev.amount_cents;
  }
  const remaining = Math.max(0, borrowed + interest - paid);
  return { borrowedCents: borrowed, paidCents: paid, interestCents: interest, remainingCents: remaining };
}

// ============================================================================
// Schema de Validação
// ============================================================================

const eventSchema = z.object({
  type: z.enum(LOAN_EVENT_TYPES, { message: 'Selecione um tipo válido' }),
  amountCents: z.number().int().positive('O valor deve ser maior que zero'),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  description: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

// ============================================================================
// Componente Principal
// ============================================================================

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;
  const session = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Query para buscar o empréstimo com saldo
  const { data: loans } = useQuery({
    queryKey: ['loans', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      return await loansService.listLoans({ status: 'all' });
    },
  });

  const loan = loans?.find((l) => l.id === loanId);

  // Query para buscar o timeline de eventos
  const { data: timeline, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['loans', userId, loanId, 'timeline'],
    enabled: !!userId && !!loanId,
    queryFn: async () => {
      if (!userId || !loanId) return [];
      return await loansService.listLoanEvents(loanId);
    },
  });

  // Form para adicionar evento
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'principal',
      amountCents: 0,
      occurredAt: new Date().toISOString().slice(0, 10),
      description: '',
    },
  });

  // Mutation para adicionar evento
  const addEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      // Mapeia tipos locais para tipos do serviço
      const eventInput = {
        loan_id: loanId,
        type: data.type === 'principal' ? 'topup' as any :
              (data.type === 'payment' || data.type === 'interest_payment') ? 'repayment' as any :
              'interest' as any,
        amount_cents: data.amountCents,
        occurred_at: data.occurredAt,
        notes: data.description || null,
      };

      // Chama método correto baseado no tipo
      if (data.type === 'principal') {
        return await loansService.topupLoan(eventInput);
      } else if (data.type === 'payment' || data.type === 'interest_payment') {
        return await loansService.repayLoan(eventInput);
      } else if (data.type === 'interest') {
        return await loansService.addInterest(eventInput);
      }
      
      throw new Error('Tipo de evento inválido');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['loans', userId] });
      await queryClient.invalidateQueries({ queryKey: ['loans', userId, loanId, 'timeline'] });
      form.reset({
        type: 'principal',
        amountCents: 0,
        occurredAt: new Date().toISOString().slice(0, 10),
        description: '',
      });
      setToast({ type: 'success', message: 'Evento registrado com sucesso!' });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (error: any) => {
      setToast({ type: 'error', message: error?.message ?? 'Falha ao adicionar evento' });
      setTimeout(() => setToast(null), 5000);
    },
  });

  const onSubmit = (data: EventFormData) => {
    addEvent.mutate(data);
  };

  // Helper para ícone do evento
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'out':
        return '➖';
      case 'in':
        return '➕';
      case 'interest':
        return '🎁';
      default:
        return '•';
    }
  };

  // Helper para label do tipo
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'out':
        return 'Emprestei';
      case 'in':
        return 'Recebi';
      case 'interest':
        return 'Juros';
      default:
        return type;
    }
  };

  if (!loan) {
    return (
      <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link href="/emprestimos" className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Voltar para empréstimos
        </Link>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{loan.person_name}</h1>
              {loan.notes && <p className="text-gray-600 italic">{loan.notes}</p>}
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-sm text-gray-500 mb-1">Saldo</p>
              <p
                className={`text-3xl font-bold ${
                  loan.balance_cents > 0 ? 'text-green-600' : loan.balance_cents < 0 ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {formatBRL(Math.abs(loan.balance_cents))}
              </p>
              {loan.balance_cents > 0 && (
                <span className="inline-block mt-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                  A receber
                </span>
              )}
              {loan.balance_cents < 0 && (
                <span className="inline-block mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full">
                  Você deve
                </span>
              )}
              {loan.balance_cents === 0 && (
                <span className="inline-block mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                  Quitado
                </span>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Emprestado</p>
              <p className="text-lg font-semibold text-gray-800">{formatBRL(loan.principal_cents)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recebido</p>
              <p className="text-lg font-semibold text-gray-800">{formatBRL(loan.paid_cents)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Juros</p>
              <p className="text-lg font-semibold text-gray-800">{formatBRL(loan.interest_cents)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 p-4 rounded-md ${
            toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Novo Evento */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Adicionar Evento</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  {...form.register('type')}
                  id="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="principal">💸 Emprestei (principal)</option>
                  <option value="payment">💰 Recebi Pagamento</option>
                  <option value="interest">📈 Aplicar Juros</option>
                  <option value="interest_payment">💵 Recebi Pagamento de Juros</option>
                </select>
                {form.formState.errors.type && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.type.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$) *
                </label>
                <Controller
                  control={form.control}
                  name="amountCents"
                  render={({ field }) => (
                    <CurrencyInputBRL
                      id="amount"
                      value={typeof field.value === "number" ? field.value : undefined}
                      onValueChange={(cents) => field.onChange(cents)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                />
                {form.formState.errors.amountCents && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.amountCents.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  {...form.register('occurredAt')}
                  id="occurredAt"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {form.formState.errors.occurredAt && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.occurredAt.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  {...form.register('description')}
                  id="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Transferência PIX, primeira parcela..."
                />
              </div>

              <button
                type="submit"
                disabled={addEvent.isPending}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {addEvent.isPending ? 'Registrando...' : 'Registrar Evento'}
              </button>
            </form>
          </div>
        </div>

        {/* Timeline de Eventos */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Histórico (últimos 10)</h2>
            {isTimelineLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-6 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : timeline && timeline.length > 0 ? (
              <div className="space-y-4">
                {timeline.slice(0, 10).map((event) => (
                  <div key={event.id} className="border-l-4 border-gray-300 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getEventIcon(event.type)}</span>
                          <span className="font-semibold text-gray-700">{getTypeLabel(event.type)}</span>
                          <span className="text-lg font-bold text-gray-800">{formatBRL(event.amount_cents)}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(event.occurred_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {event.notes && <p className="text-sm text-gray-600 mt-1 italic">{event.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum evento registrado ainda.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

