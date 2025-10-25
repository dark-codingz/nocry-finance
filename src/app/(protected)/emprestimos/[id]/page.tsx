// /app/emprestimos/[id]/page.tsx
"use client";

// ============================================================================
// Página de Detalhes do Empréstimo
// ============================================================================
// Exibe o timeline de eventos e permite adicionar novos eventos.
// Valores monetários sempre em centavos (number).
// Calcula agregados localmente a partir dos eventos.
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatBRL } from '@/lib/money';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import * as loansService from '@/services/loans';
import type { LoanEventType } from '@/domain/loans/eventTypes';
import { LOAN_EVENT_TYPES } from '@/domain/loans/eventTypes';

// ============================================================================
// Tipos
// ============================================================================

type Aggregates = {
  borrowedCents: number; // Total emprestado (disbursement + topup)
  paidCents: number; // Total recebido (repayment + interest_payment)
  interestCents: number; // Total de juros acumulados (interest)
  remainingCents: number; // Saldo devedor
};

// ============================================================================
// Schema de Validação
// ============================================================================

const eventSchema = z.object({
  type: z.enum(['disbursement', 'topup', 'repayment', 'interest'], {
    required_error: 'Selecione um tipo',
  }),
  amountCents: z.number().int().positive('O valor deve ser maior que zero'),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  notes: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

// ============================================================================
// Helper: Calcular Agregados
// ============================================================================

function computeAggregates(
  events: Array<{ type: LoanEventType; amount_cents: number }>
): Aggregates {
  let borrowed = 0;
  let paid = 0;
  let interest = 0;

  for (const ev of events) {
    if (ev.type === LOAN_EVENT_TYPES.DISBURSEMENT || ev.type === LOAN_EVENT_TYPES.TOPUP) {
      borrowed += ev.amount_cents;
    } else if (ev.type === LOAN_EVENT_TYPES.REPAYMENT) {
      paid += ev.amount_cents;
    } else if (ev.type === LOAN_EVENT_TYPES.INTEREST) {
      interest += ev.amount_cents;
    }
  }

  const remaining = Math.max(0, borrowed + interest - paid);

  return {
    borrowedCents: borrowed,
    paidCents: paid,
    interestCents: interest,
    remainingCents: remaining,
  };
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function LoanDetailPage() {
  const params = useParams();
  const loanId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loan, setLoan] = useState<loansService.Loan | null>(null);
  const [aggregates, setAggregates] = useState<Aggregates>({
    borrowedCents: 0,
    paidCents: 0,
    interestCents: 0,
    remainingCents: 0,
  });
  const [events, setEvents] = useState<loansService.LoanEvent[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form para adicionar evento
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'disbursement',
      amountCents: 0,
      occurredAt: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  // Carregar dados
  useEffect(() => {
    if (!loanId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [loanData, evs] = await Promise.all([
          loansService.getLoanById(loanId),
          loansService.listLoanEvents(loanId),
        ]);

        if (!loanData) {
          setError('Empréstimo não encontrado');
          return;
        }

        setLoan(loanData);
        setEvents(evs);
        setAggregates(computeAggregates(evs));
      } catch (e: any) {
        setError(e?.message ?? 'Falha ao carregar empréstimo');
      } finally {
        setLoading(false);
      }
    })();
  }, [loanId]);

  // Adicionar evento
  const onSubmit = async (data: EventFormData) => {
    if (!loanId) return;

    try {
      setIsSubmitting(true);

      const eventInput: loansService.LoanEventInput = {
        loan_id: loanId,
        type: data.type as LoanEventType,
        amount_cents: data.amountCents,
        occurred_at: data.occurredAt,
        notes: data.notes || null,
      };

      // Escolher a função correta baseada no tipo
      if (data.type === LOAN_EVENT_TYPES.TOPUP) {
        await loansService.topupLoan(eventInput);
      } else if (data.type === LOAN_EVENT_TYPES.REPAYMENT) {
        await loansService.repayLoan(eventInput);
      } else if (data.type === LOAN_EVENT_TYPES.INTEREST) {
        await loansService.addInterest(eventInput);
      } else {
        // Para outros tipos (disbursement), usar a API genérica
        throw new Error('Tipo de evento não suportado para criação manual');
      }

      // Recarregar eventos
      const updatedEvents = await loansService.listLoanEvents(loanId);
      setEvents(updatedEvents);
      setAggregates(computeAggregates(updatedEvents));

      // Reset form
      form.reset({
        type: 'topup',
        amountCents: 0,
        occurredAt: new Date().toISOString().slice(0, 10),
        notes: '',
      });

      setToast({ type: 'success', message: 'Evento registrado com sucesso!' });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message ?? 'Falha ao adicionar evento' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para ícone do evento
  const getEventIcon = (type: string) => {
    switch (type) {
      case LOAN_EVENT_TYPES.DISBURSEMENT:
        return '💰';
      case LOAN_EVENT_TYPES.TOPUP:
        return '➕';
      case LOAN_EVENT_TYPES.REPAYMENT:
        return '💵';
      case LOAN_EVENT_TYPES.INTEREST:
        return '📈';
      default:
        return '•';
    }
  };

  // Helper para label do tipo
  const getTypeLabel = (type: string) => {
    switch (type) {
      case LOAN_EVENT_TYPES.DISBURSEMENT:
        return 'Desembolso';
      case LOAN_EVENT_TYPES.TOPUP:
        return 'Aporte adicional';
      case LOAN_EVENT_TYPES.REPAYMENT:
        return 'Pagamento';
      case LOAN_EVENT_TYPES.INTEREST:
        return 'Juros';
      default:
        return type;
    }
  };

  // Estados de carregamento e erro
  if (loading) {
    return (
      <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Carregando...</p>
        </div>
      </main>
    );
  }

  if (error || !loan) {
    return (
      <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">{error || 'Empréstimo não encontrado'}</p>
          <Link href="/emprestimos" className="text-indigo-600 hover:underline mt-4 inline-block">
            ← Voltar para empréstimos
          </Link>
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
              <p className="text-sm text-gray-500 mb-1">Saldo devedor</p>
              <p
                className={`text-3xl font-bold ${
                  aggregates.remainingCents > 0
                    ? 'text-green-600'
                    : aggregates.remainingCents < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {formatBRL(Math.abs(aggregates.remainingCents))}
              </p>
              {aggregates.remainingCents > 0 && (
                <span className="inline-block mt-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                  A receber
                </span>
              )}
              {aggregates.remainingCents === 0 && (
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
              <p className="text-lg font-semibold text-gray-800">
                {formatBRL(aggregates.borrowedCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recebido</p>
              <p className="text-lg font-semibold text-gray-800">
                {formatBRL(aggregates.paidCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Juros</p>
              <p className="text-lg font-semibold text-gray-800">
                {formatBRL(aggregates.interestCents)}
              </p>
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
                  <option value={LOAN_EVENT_TYPES.TOPUP}>➕ Aporte adicional</option>
                  <option value={LOAN_EVENT_TYPES.REPAYMENT}>💵 Pagamento recebido</option>
                  <option value={LOAN_EVENT_TYPES.INTEREST}>📈 Juros</option>
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
                      value={typeof field.value === 'number' ? field.value : undefined}
                      onValueChange={(cents) => field.onChange(cents)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                />
                {form.formState.errors.amountCents && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.amountCents.message}
                  </p>
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
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.occurredAt.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  {...form.register('notes')}
                  id="notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Transferência PIX, primeira parcela..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Evento'}
              </button>
            </form>
          </div>
        </div>

        {/* Timeline de Eventos */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Histórico (últimos 20)</h2>
            {events && events.length > 0 ? (
              <div className="space-y-4">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="border-l-4 border-gray-300 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getEventIcon(event.type)}</span>
                          <span className="font-semibold text-gray-700">
                            {getTypeLabel(event.type)}
                          </span>
                          <span className="text-lg font-bold text-gray-800">
                            {formatBRL(event.amount_cents)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(event.occurred_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">{event.notes}</p>
                        )}
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
