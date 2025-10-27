// ============================================================================
// Formulário: LoanEventForm (Registrar Evento)
// ============================================================================
// PROPÓSITO:
// - Registrar eventos em um empréstimo: pagamento, aporte, juros manual
// - Valida valor e data
// - Suporta diferentes tipos de evento via prop 'type'
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import {
  useRepayLoan,
  useTopupLoan,
  useAddInterest,
  type LoanEventInput,
} from '@/hooks/finance/loans';
import {
  LoanEventType,
  LOAN_EVENT_TYPES,
} from '@/domain/loans/eventTypes';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  amount_cents: z.number().min(1, 'Informe o valor'),
  occurred_at: z.string().min(10, 'Informe a data'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Props (aceita apenas os 3 tipos usados no formulário)
// ────────────────────────────────────────────────────────────────────────────
type Props = {
  loanId: string;
  type: typeof LOAN_EVENT_TYPES.REPAYMENT | typeof LOAN_EVENT_TYPES.TOPUP | typeof LOAN_EVENT_TYPES.INTEREST;
  onClose?: () => void;
};

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function LoanEventForm({ loanId, type, onClose }: Props) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_cents: 0,
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const repay = useRepayLoan();
  const topup = useTopupLoan();
  const addInterest = useAddInterest();

  // Mapeia tipo para mutation e label (usando constantes)
  const configMap = {
    [LOAN_EVENT_TYPES.REPAYMENT]: { 
      label: 'Pagamento', 
      mutation: repay, 
      success: 'Pagamento registrado!' 
    },
    [LOAN_EVENT_TYPES.TOPUP]: { 
      label: 'Aporte', 
      mutation: topup, 
      success: 'Aporte registrado!' 
    },
    [LOAN_EVENT_TYPES.INTEREST]: { 
      label: 'Juros', 
      mutation: addInterest, 
      success: 'Juros adicionados!' 
    },
  };
  
  const config = configMap[type];

  async function onSubmit(v: FormValues) {
    try {
      const input: LoanEventInput = {
        loan_id: loanId,
        type,
        amount_cents: v.amount_cents,
        occurred_at: v.occurred_at,
        notes: v.notes ?? null,
      };

      await config.mutation.mutateAsync(input);
      toast.success(config.success);
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Valor */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Valor <span className="text-red-400">*</span>
        </label>
        <Controller
          control={control}
          name="amount_cents"
          render={({ field }) => (
            <CurrencyInputBRL
              value={field.value}
              onValueChange={field.onChange}
              autoFocus
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
            />
          )}
        />
        {errors.amount_cents && (
          <p className="text-red-400 text-xs mt-1">{errors.amount_cents.message}</p>
        )}
      </div>

      {/* Data */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Data <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          {...register('occurred_at')}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
        {errors.occurred_at && (
          <p className="text-red-400 text-xs mt-1">{errors.occurred_at.message}</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Observações <span className="text-[#9F9D9D]">(opcional)</span>
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Detalhes sobre este evento..."
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isSubmitting ? 'Registrando...' : `Registrar ${config.label}`}
      </button>
    </form>
  );
}

