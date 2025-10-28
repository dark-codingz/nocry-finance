// ============================================================================
// TransferForm - Formulário de Transferência entre Contas
// ============================================================================
// PROPÓSITO:
// - Formulário para transferir valores entre contas do usuário
// - Validação com Zod + React Hook Form
// - CurrencyInputIncremental para valores em centavos (formatação estilo caixa)
// - Cria 2 transações vinculadas por transfer_group_id
//
// VALIDAÇÕES:
// - Valor > 0 (centavos)
// - Conta origem obrigatória
// - Conta destino obrigatória
// - Origem ≠ Destino
// - Data obrigatória (ISO YYYY-MM-DD)
// - Descrição opcional
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries (transactions, finance-kpis)
// - Chama onSuccess (para fechar drawer)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import CurrencyInputIncremental from '@/components/form/CurrencyInputIncremental';
import { useAccounts } from '@/hooks/finance/lookups';
import * as finance from '@/services/finance';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    from_account_id: z.string().min(1, 'Conta origem obrigatória'),
    to_account_id: z.string().min(1, 'Conta destino obrigatória'),
    amount_cents: z.number().min(1, 'Informe um valor'),
    occurred_at: z.string().min(10, 'Informe a data'),
    description: z.string().optional(),
  })
  // Validação: origem e destino devem ser diferentes
  .refine((v) => v.from_account_id !== v.to_account_id, {
    path: ['to_account_id'],
    message: 'Origem e destino devem ser diferentes.',
  });

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────
export default function TransferForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: accounts = [] } = useAccounts();
  const qc = useQueryClient();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurred_at: format(new Date(), 'yyyy-MM-dd'),
      amount_cents: 0,
      from_account_id: '',
      to_account_id: '',
      description: '',
    },
  });

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(v: FormValues) {
    try {
      await finance.transfer(v);

      toast.success('Transferência registrada!');

      // Invalidar queries relevantes
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-kpis'] });
      qc.invalidateQueries({ queryKey: ['recent-finance'] });

      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar transferência');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Origem e Destino
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Conta Origem */}
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Origem</label>
          <select
            {...register('from_account_id')}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
            autoFocus
          >
            <option value="">Selecione…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.from_account_id && (
            <p className="text-red-400 text-xs mt-1">{errors.from_account_id.message}</p>
          )}
        </div>

        {/* Conta Destino */}
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Destino</label>
          <select
            {...register('to_account_id')}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          >
            <option value="">Selecione…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.to_account_id && (
            <p className="text-red-400 text-xs mt-1">{errors.to_account_id.message}</p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Valor (CurrencyInputIncremental)
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Valor</label>
        <Controller
          control={control}
          name="amount_cents"
          render={({ field }) => (
            <CurrencyInputIncremental
              value={typeof field.value === 'number' ? field.value : 0}
              onValueChange={(c) => field.onChange(c)}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
            />
          )}
        />
        {errors.amount_cents && (
          <p className="text-red-400 text-xs mt-1">{errors.amount_cents.message}</p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Data e Descrição
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Data */}
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Data</label>
          <input
            type="date"
            {...register('occurred_at')}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          />
          {errors.occurred_at && (
            <p className="text-red-400 text-xs mt-1">{errors.occurred_at.message}</p>
          )}
        </div>

        {/* Descrição (opcional) */}
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">
            Descrição <span className="text-[#9F9D9D]">(opcional)</span>
          </label>
          <input
            {...register('description')}
            placeholder="ex.: Ajuste, Poupança…"
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Botão Submit
          ════════════════════════════════════════════════════════════════ */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}



