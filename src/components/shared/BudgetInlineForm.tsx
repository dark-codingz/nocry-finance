// ============================================================================
// BudgetInlineForm - Formulário Reutilizável de Orçamento
// ============================================================================
// PROPÓSITO:
// - Componente reutilizável para input de orçamento mensal
// - Usado em: Carteira (drawer), Onboarding (passo 4), outros
// - Integração com services/budgets.ts (saveBudget RPC)
// - Feedback visual (toast) e invalidação de cache
// ============================================================================

'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { saveBudget } from '@/services/budgets';
import { toast } from 'sonner';
import dayjs from 'dayjs';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  amount_cents: z.number().min(100, 'Informe um valor maior que R$ 1,00'),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────
export interface BudgetInlineFormProps {
  /** Mês no formato YYYY-MM (default: mês atual) */
  defaultMonthKey?: string;
  /** Valor inicial em centavos (default: 0) */
  defaultAmountCents?: number;
  /** Callback após salvar com sucesso */
  onSaved?: (data: any) => void;
  /** Exibir informação do mês? (default: true) */
  showMonthLabel?: boolean;
  /** Texto do botão submit (default: "Salvar orçamento") */
  submitLabel?: string;
  /** Auto-focus no input? (default: false) */
  autoFocus?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function BudgetInlineForm({
  defaultMonthKey,
  defaultAmountCents = 0,
  onSaved,
  showMonthLabel = true,
  submitLabel = 'Salvar orçamento',
  autoFocus = false,
}: BudgetInlineFormProps) {
  const qc = useQueryClient();

  // Mês de referência (default: mês atual)
  const monthKey = defaultMonthKey ?? dayjs().format('YYYY-MM');

  // ──────────────────────────────────────────────────────────────────
  // Form
  // ──────────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_cents: defaultAmountCents,
    },
  });

  // Atualizar form se defaultAmountCents mudar (útil quando carrega orçamento existente)
  useEffect(() => {
    reset({ amount_cents: defaultAmountCents });
  }, [defaultAmountCents, reset]);

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    try {
      const result = await saveBudget({
        amountCents: values.amount_cents,
        monthKey,
      });

      // Invalidar queries relevantes (Dashboard, Carteira, etc.)
      qc.invalidateQueries({ queryKey: ['budget'] });
      qc.invalidateQueries({ queryKey: ['monthly-budget', monthKey] });
      qc.invalidateQueries({ queryKey: ['pf-month-summary'] });
      qc.invalidateQueries({ queryKey: ['pf-fixed-remaining'] });
      qc.invalidateQueries({ queryKey: ['pf-card-invoices-current-total'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });

      toast.success('Orçamento definido com sucesso!');
      onSaved?.(result);
    } catch (e: any) {
      console.error('[BudgetInlineForm] Erro ao salvar:', e);
      toast.error(e.message || 'Erro ao salvar orçamento');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Mês de referência (opcional) */}
      {showMonthLabel && (
        <div className="text-sm text-[#CACACA] bg-white/5 rounded-lg px-3 py-2 border border-white/10">
          📅 Orçamento de{' '}
          <span className="font-medium text-white">
            {dayjs(monthKey + '-01').format('MMMM [de] YYYY')}
          </span>
        </div>
      )}

      {/* Valor do orçamento */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Valor do orçamento <span className="text-red-400">*</span>
        </label>
        <Controller
          name="amount_cents"
          control={control}
          render={({ field }) => (
            <CurrencyInputBRL
              value={typeof field.value === 'number' ? field.value : 0}
              onValueChange={(cents) => field.onChange(cents)}
              autoFocus={autoFocus}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
              placeholder="R$ 0,00"
            />
          )}
        />
        {errors.amount_cents && (
          <p className="text-red-400 text-xs mt-1">
            {errors.amount_cents.message}
          </p>
        )}
        <p className="text-[11px] text-[#9F9D9D] mt-1">
          Defina quanto você planeja gastar neste mês.
        </p>
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}



