// ============================================================================
// Formulário: LoanConfigForm (Editar Configuração)
// ============================================================================
// PROPÓSITO:
// - Editar nome, notas, modo de juros e taxa de um empréstimo
// - Botão extra para aplicar juros até hoje
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import {
  useUpdateLoanConfig,
  useApplyInterestPeriod,
  type LoanSummary,
} from '@/hooks/finance/loans';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  person_name: z.string().min(2, 'Informe o nome'),
  notes: z.string().optional(),
  interest_mode: z.enum(['none', 'simple', 'compound_monthly', 'exact']), // ✅ Inclui 'exact'
  interest_rate_bps: z.number().int().min(0).max(5000), // até 50%/mês
  interest_exact_cents: z.number().int().min(0), // ✅ Novo campo
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function LoanConfigForm({
  loan,
  onClose,
}: {
  loan: LoanSummary;
  onClose?: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      person_name: loan.person_name,
      notes: loan.notes ?? '',
      interest_mode: loan.interest_mode ?? 'none',
      interest_rate_bps: loan.interest_rate_bps ?? 0,
      interest_exact_cents: loan.interest_exact_cents ?? 0, // ✅ Novo campo
    },
  });

  const interestMode = watch('interest_mode'); // ✅ Observar mudança no modo

  const update = useUpdateLoanConfig();
  const apply = useApplyInterestPeriod();

  async function onSubmit(v: FormValues) {
    try {
      await update.mutateAsync({ id: loan.id, input: v });
      toast.success('Configuração atualizada!');
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  }

  async function aplicarJurosAteHoje() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await apply.mutateAsync({ loan_id: loan.id, untilISO: today });
      toast.success('Juros aplicados até hoje!');
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aplicar juros');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Pessoa */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Pessoa</label>
        <input
          {...register('person_name')}
          autoFocus
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
        {errors.person_name && (
          <p className="text-red-400 text-xs mt-1">{errors.person_name.message}</p>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Observações</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
      </div>

      {/* Configuração de juros */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">
          Configuração de Juros
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Modo */}
          <div>
            <label className="text-sm text-[#CACACA] block mb-1">Modo</label>
            <select
              {...register('interest_mode')}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
            >
              <option value="none">Sem juros</option>
              <option value="simple">Simples (proporcional/dia)</option>
              <option value="compound_monthly">Composto (mensal)</option>
              <option value="exact">Exato (valor fixo)</option>
            </select>
          </div>

          {/* Taxa (desabilitado se modo = exact) */}
          <div>
            <label className="text-sm text-[#CACACA] block mb-1">
              Taxa mensal (bps)
            </label>
            <input
              type="number"
              min={0}
              max={5000}
              disabled={interestMode === 'exact'}
              {...register('interest_rate_bps', {
                valueAsNumber: true,
                setValueAs: (v) => (v === '' ? 0 : Number(v)),
              })}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors disabled:opacity-40"
            />
            <p className="text-[11px] text-[#9F9D9D] mt-1">
              Ex.: 250 = 2,50% ao mês
            </p>
            {errors.interest_rate_bps && (
              <p className="text-red-400 text-xs mt-1">
                {errors.interest_rate_bps.message}
              </p>
            )}
          </div>
        </div>

        {/* Campo Juros Exato (visível apenas quando mode === "exact") */}
        {interestMode === 'exact' && (
          <div className="mt-3">
            <label className="text-sm text-[#CACACA] block mb-1">
              Valor do juros (R$)
            </label>
            <Controller
              name="interest_exact_cents"
              control={control}
              render={({ field }) => (
                <CurrencyInputBRL
                  value={typeof field.value === 'number' ? field.value : 0}
                  onValueChange={(cents) => field.onChange(cents)}
                  className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
                  placeholder="ex.: R$ 200,00"
                />
              )}
            />
            <p className="text-[11px] text-[#9F9D9D] mt-1">
              Valor fixo somado ao principal. Saldo total = principal + juros exato − pagamentos.
            </p>
            {errors.interest_exact_cents && (
              <p className="text-red-400 text-xs mt-1">
                {errors.interest_exact_cents.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-[#D4AF37] text-black font-medium py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={aplicarJurosAteHoje}
          disabled={
            loan.interest_mode === 'none' ||
            loan.interest_mode === 'exact' ||
            loan.interest_rate_bps <= 0
          }
          className="flex-1 rounded-lg bg-white/5 text-[#CACACA] border border-white/10 py-3 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Aplicar juros até hoje
        </button>
      </div>

      {(loan.interest_mode === 'none' || loan.interest_mode === 'exact') && (
        <p className="text-xs text-[#9F9D9D] text-center">
          {loan.interest_mode === 'exact'
            ? 'Modo "Exato" não aplica juros automaticamente'
            : 'Configure modo de juros e taxa para aplicar juros automáticos'}
        </p>
      )}
    </form>
  );
}

