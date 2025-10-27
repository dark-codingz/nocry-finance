// ============================================================================
// Formulário: LoanForm (Criar Empréstimo)
// ============================================================================
// PROPÓSITO:
// - Criar novo empréstimo com configuração de juros
// - Valida campos obrigatórios (pessoa, valor, data)
// - Configura modo de juros e taxa (opcional)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useCreateLoan } from '@/hooks/finance/loans';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  person_name: z.string().min(2, 'Informe o nome da pessoa'),
  principal_cents: z.number().min(1, 'Informe o valor emprestado'),
  started_at: z.string().min(10, 'Informe a data'),
  notes: z.string().optional(),
  interest_mode: z.enum(['none', 'simple', 'compound_monthly', 'exact']), // ✅ Inclui 'exact'
  interest_rate_bps: z.number().int().min(0).max(5000), // até 50%/mês
  interest_exact_cents: z.number().int().min(0), // ✅ Novo campo
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function LoanForm({ onClose }: { onClose?: () => void }) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      person_name: '',
      principal_cents: 0,
      started_at: new Date().toISOString().slice(0, 10),
      notes: '',
      interest_mode: 'none',
      interest_rate_bps: 0,
      interest_exact_cents: 0, // ✅ Novo campo
    },
  });

  const interestMode = watch('interest_mode'); // ✅ Observar mudança no modo

  const create = useCreateLoan();

  async function onSubmit(v: FormValues) {
    try {
      await create.mutateAsync(v);
      toast.success('Empréstimo criado!');
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar empréstimo');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Pessoa */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Pessoa <span className="text-red-400">*</span>
        </label>
        <input
          {...register('person_name')}
          autoFocus
          placeholder="ex: João Silva"
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
        {errors.person_name && (
          <p className="text-red-400 text-xs mt-1">{errors.person_name.message}</p>
        )}
      </div>

      {/* Valor emprestado */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Valor emprestado <span className="text-red-400">*</span>
        </label>
        <Controller
          control={control}
          name="principal_cents"
          render={({ field }) => (
            <CurrencyInputBRL
              value={field.value}
              onValueChange={field.onChange}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
            />
          )}
        />
        {errors.principal_cents && (
          <p className="text-red-400 text-xs mt-1">
            {errors.principal_cents.message}
          </p>
        )}
      </div>

      {/* Data do empréstimo */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Data <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          {...register('started_at')}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
        {errors.started_at && (
          <p className="text-red-400 text-xs mt-1">{errors.started_at.message}</p>
        )}
      </div>

      {/* Notas (opcional) */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Observações <span className="text-[#9F9D9D]">(opcional)</span>
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Detalhes, condições, etc."
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
      </div>

      {/* Configuração de juros */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">
          Configuração de Juros
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Modo de juros */}
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

          {/* Taxa mensal (bps) - desabilitado se modo = exact */}
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
              placeholder="ex: 250 = 2,50%"
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors disabled:opacity-40"
            />
            <p className="text-[11px] text-[#9F9D9D] mt-1">
              Ex.: 250 = 2,50% ao mês
            </p>
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
              Valor fixo de juros que será somado ao principal.
            </p>
          </div>
        )}
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isSubmitting ? 'Criando...' : 'Criar Empréstimo'}
      </button>
    </form>
  );
}

