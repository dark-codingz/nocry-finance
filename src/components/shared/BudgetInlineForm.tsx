// ============================================================================
// BudgetInlineForm - Formulário de Orçamento Mensal
// ============================================================================
// PROPÓSITO:
// - Criar ou atualizar orçamento do mês atual
// - Input de valor em BRL
// - Validação com Zod
// ============================================================================

'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { setBudget } from '@/services/budgets';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const budgetSchema = z.object({
  totalCents: z.number().int().positive('O valor deve ser maior que zero'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────
interface BudgetInlineFormProps {
  defaultMonthKey?: string;
  defaultAmountCents?: number;
  initialValueCents?: number;
  onSaved?: () => void;
  showMonthLabel?: boolean;
  submitLabel?: string;
  autoFocus?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function BudgetInlineForm({ 
  defaultMonthKey,
  defaultAmountCents = 0,
  initialValueCents,
  onSaved,
  showMonthLabel = false,
  submitLabel = 'Salvar Orçamento',
  autoFocus = false,
}: BudgetInlineFormProps) {
  const qc = useQueryClient();
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Usa defaultAmountCents se fornecido, senão initialValueCents
  const initialValue = defaultAmountCents || initialValueCents || 0;

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      totalCents: initialValue,
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Usa defaultMonthKey se fornecido, senão mês atual
      const month = defaultMonthKey || new Date().toISOString().slice(0, 7); // YYYY-MM
      await setBudget(supabase, userId, { monthStr: month, amountCents: data.totalCents });
      
      // Invalidar queries
      qc.invalidateQueries({ queryKey: ['budget'] });
      qc.invalidateQueries({ queryKey: ['pf-month-summary'] });
      
      toast.success('Orçamento salvo com sucesso!');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar orçamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {showMonthLabel && defaultMonthKey && (
        <div className="text-[#CACACA] text-sm mb-2">
          Mês: {defaultMonthKey}
        </div>
      )}
      <div>
        <label htmlFor="totalCents" className="block text-sm font-medium text-[#CACACA] mb-2">
          Valor do Orçamento (R$) *
        </label>
        <Controller
          control={form.control}
          name="totalCents"
          render={({ field }) => (
            <input
              type="number"
              step="0.01"
              value={field.value / 100}
              onChange={(e) => {
                const reais = parseFloat(e.target.value) || 0;
                field.onChange(Math.round(reais * 100));
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[#9F9D9D] focus:outline-none focus:border-[#D4AF37] transition-colors"
              placeholder="0,00"
              autoFocus={autoFocus}
            />
          )}
        />
        {form.formState.errors.totalCents && (
          <p className="mt-1.5 text-sm text-red-400">
            {form.formState.errors.totalCents.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
