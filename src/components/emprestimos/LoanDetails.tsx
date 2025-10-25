// ============================================================================
// Componente: LoanDetails (Extrato do Empréstimo)
// ============================================================================
// PROPÓSITO:
// - Exibir extrato completo de eventos de um empréstimo
// - Mostra tipo, valor, data e observações de cada evento
// - Agrupa por tipo (desembolso, aporte, pagamento, juros)
// ============================================================================

'use client';

import { useLoanEvents, type LoanSummary } from '@/hooks/finance/loans';
import {
  LOAN_EVENT_TYPES,
  LOAN_EVENT_TYPE_LABELS,
  LOAN_EVENT_TYPE_COLORS,
  type LoanEventType,
} from '@/domain/loans/eventTypes';
import { formatBRL } from '@/lib/money';
import { Calendar, ArrowUp, ArrowDown, TrendingUp, Wallet } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────
type Props = {
  loan: LoanSummary;
};

// ────────────────────────────────────────────────────────────────────────────
// Mapeia tipo de evento para ícone e label (usando constantes centralizadas)
// ────────────────────────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  [LOAN_EVENT_TYPES.DISBURSEMENT]: {
    icon: Wallet,
    label: LOAN_EVENT_TYPE_LABELS[LOAN_EVENT_TYPES.DISBURSEMENT],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  [LOAN_EVENT_TYPES.TOPUP]: {
    icon: ArrowUp,
    label: LOAN_EVENT_TYPE_LABELS[LOAN_EVENT_TYPES.TOPUP],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  [LOAN_EVENT_TYPES.REPAYMENT]: {
    icon: ArrowDown,
    label: LOAN_EVENT_TYPE_LABELS[LOAN_EVENT_TYPES.REPAYMENT],
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  [LOAN_EVENT_TYPES.INTEREST]: {
    icon: TrendingUp,
    label: LOAN_EVENT_TYPE_LABELS[LOAN_EVENT_TYPES.INTEREST],
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function LoanDetails({ loan }: Props) {
  const { data: events = [], isLoading } = useLoanEvents(loan.id);

  return (
    <div className="space-y-4">
      {/* Resumo do empréstimo */}
      <div className="glass rounded-xl border border-white/10 p-4">
        <h3 className="text-white font-medium mb-3">{loan.person_name}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#9F9D9D]">Emprestado:</span>
            <div className="text-white font-medium">
              {formatBRL(loan.principal_cents)}
            </div>
          </div>
          <div>
            <span className="text-[#9F9D9D]">Recebido:</span>
            <div className="text-green-400 font-medium">
              {formatBRL(loan.paid_cents)}
            </div>
          </div>
          <div>
            <span className="text-[#9F9D9D]">Juros:</span>
            <div className="text-orange-400 font-medium">
              {formatBRL(loan.interest_cents)}
            </div>
          </div>
          <div>
            <span className="text-[#9F9D9D]">Saldo:</span>
            <div
              className={`font-medium ${
                loan.balance_cents > 0 ? 'text-red-400' : 'text-[#CACACA]'
              }`}
            >
              {formatBRL(loan.balance_cents)}
            </div>
          </div>
        </div>
      </div>

      {/* Extrato de eventos */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Extrato Completo
        </h4>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-[#9F9D9D] text-sm">
            Nenhum evento registrado ainda
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const config = EVENT_CONFIG[event.type];
              const Icon = config.icon;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {/* Ícone */}
                  <div
                    className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-white text-sm font-medium">
                          {config.label}
                        </div>
                        <div className="text-[#9F9D9D] text-xs mt-0.5">
                          {new Date(event.occurred_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          event.type === LOAN_EVENT_TYPES.REPAYMENT
                            ? 'text-green-400'
                            : config.color
                        }`}
                      >
                        {event.type === LOAN_EVENT_TYPES.REPAYMENT ? '- ' : '+ '}
                        {formatBRL(event.amount_cents)}
                      </div>
                    </div>

                    {/* Observações */}
                    {event.notes && (
                      <p className="text-xs text-[#CACACA] mt-2 line-clamp-2">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

