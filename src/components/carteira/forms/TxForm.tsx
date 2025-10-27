// ============================================================================
// TxForm - Formulário de Transação (Criar)
// ============================================================================
// PROPÓSITO:
// - Formulário reutilizável para criar despesas/receitas
// - Validação com Zod + React Hook Form
// - Integração com CurrencyInputBRL
//
// PROPS:
// - kind: "expense" | "income" - Tipo de transação
// - onSuccess?: () => void - Callback após salvar
//
// TODO (v2):
// - Aceitar defaultValues para modo edição
// - Suportar transferências
// ============================================================================

'use client';

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { useCategoriesForSelect, useAccounts, useCards } from '@/hooks/finance/lookups';
import { useQueryClient } from '@tanstack/react-query';
import { createCardInstallments } from '@/services/transactions';
import { formatBRL } from '@/lib/money';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  amount_cents: z.number().int().positive('Valor deve ser maior que zero'),
  occurred_at: z.string().min(1, 'Informe a data'),
  description: z.string().optional(),
  account_id: z.string().optional(),
  card_id: z.string().optional(),
  category_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────────
export default function TxForm({
  kind,
  onSuccess,
}: {
  kind: 'expense' | 'income';
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();

  // Estado para parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [numInstallments, setNumInstallments] = useState(2);
  const [startNextInvoice, setStartNextInvoice] = useState(false);

  // Buscar lookups
  const { data: categories = [] } = useCategoriesForSelect(kind);
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_cents: 0, // ✅ Corrigido: valor inicial
      occurred_at: new Date().toISOString().split('T')[0],
    },
  });

  // Watch para saber se tem cartão selecionado (habilita parcelamento)
  const cardId = watch('card_id');
  const amountCents = watch('amount_cents') || 0;

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    try {
      // Se for parcelamento no cartão
      if (isInstallment && values.card_id && kind === 'expense') {
        await createCardInstallments({
          card_id: values.card_id,
          category_id: values.category_id || null,
          description: values.description || 'Compra parcelada',
          first_date: values.occurred_at,                 // ORDEM CORRIGIDA
          num_installments: numInstallments,
          start_next_invoice: startNextInvoice,
          total_cents: values.amount_cents,               // TOTAL POR ÚLTIMO
        });

        toast.success(
          `Parcelas criadas! ${numInstallments}x de ${formatBRL(Math.floor(values.amount_cents / numInstallments))}`
        );
      } else {
        // Transação única (fluxo normal)
        const supabase = createSupabaseBrowser();

        const payload = {
          type: kind,
          amount_cents: values.amount_cents,
          occurred_at: values.occurred_at,
          description: values.description || null,
          account_id: values.account_id || null,
          card_id: values.card_id || null,
          category_id: values.category_id || null,
        };

        const { error } = await supabase.from('transactions').insert(payload);

        if (error) throw error;

        toast.success(
          kind === 'expense' ? 'Despesa lançada!' : 'Receita lançada!'
        );
      }

      // Invalidar caches
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-kpis'] });
      qc.invalidateQueries({ queryKey: ['recent-finance'] });
      qc.invalidateQueries({ queryKey: ['pf-month-summary'] });
      qc.invalidateQueries({ queryKey: ['pf-card-invoices-current-total'] });
      qc.invalidateQueries({ queryKey: ['pf-monthly-series'] }); // Gráfico mensal
      qc.invalidateQueries({ queryKey: ['pf-net-by-period'] }); // Saldo líquido filtrado

      onSuccess?.();
    } catch (e) {
      const error = e as { message?: string };
      toast.error(error.message || 'Erro ao salvar transação');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Valor
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Valor *</label>
        <Controller
          name="amount_cents"
          control={control}
          render={({ field }) => (
            <CurrencyInputBRL
              value={typeof field.value === 'number' ? field.value : 0} // ✅ Garantir valor válido
              onValueChange={field.onChange}
              placeholder="R$ 0,00"
              autoFocus
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
            />
          )}
        />
        {errors.amount_cents && (
          <p className="text-red-400 text-xs mt-1">
            {errors.amount_cents.message}
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Data
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Data *</label>
        <input
          type="date"
          {...register('occurred_at')}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        />
        {errors.occurred_at && (
          <p className="text-red-400 text-xs mt-1">
            {errors.occurred_at.message}
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Descrição
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Descrição</label>
        <input
          type="text"
          {...register('description')}
          placeholder={
            kind === 'expense'
              ? 'ex.: Mercado, Uber...'
              : 'ex.: Salário, Freelance...'
          }
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Categoria
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Categoria</label>
        <select
          {...register('category_id')}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        >
          <option value="">Selecione...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Conta / Cartão
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Conta</label>
          <select
            {...register('account_id')}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          >
            <option value="">Selecione...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Cartão</label>
          <select
            {...register('card_id')}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          >
            <option value="">Selecione...</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Parcelamento (só aparece se for DESPESA e CARTÃO)
          ════════════════════════════════════════════════════════════════ */}
      {kind === 'expense' && cardId && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          {/* Toggle parcelar */}
          <label className="flex items-center gap-2 text-[#CACACA] text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isInstallment}
              onChange={(e) => setIsInstallment(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-transparent text-[#D4AF37] focus:ring-0 focus:ring-offset-0"
            />
            <span className="font-medium">Parcelar compra</span>
          </label>

          {/* Opções de parcelamento */}
          {isInstallment && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Número de parcelas */}
                <div>
                  <label className="text-xs text-[#CACACA] block mb-1">
                    Parcelas
                  </label>
                  <select
                    value={numInstallments}
                    onChange={(e) =>
                      setNumInstallments(parseInt(e.target.value, 10))
                    }
                    className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white text-sm focus:border-white/20 transition-colors"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}x
                      </option>
                    ))}
                  </select>
                </div>

                {/* Começar na próxima fatura */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-[#CACACA] text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={startNextInvoice}
                      onChange={(e) => setStartNextInvoice(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-transparent text-[#D4AF37] focus:ring-0 focus:ring-offset-0"
                    />
                    Começar na próxima fatura
                  </label>
                </div>
              </div>

              {/* Preview do parcelamento */}
              {amountCents > 0 && (
                <div className="text-[#9F9D9D] text-sm bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  💳 {numInstallments}x de{' '}
                  <span className="text-white font-medium">
                    {formatBRL(Math.floor(amountCents / numInstallments))}
                  </span>
                  {startNextInvoice && (
                    <span className="ml-2 text-xs">(próxima fatura)</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Botão Submit
          ════════════════════════════════════════════════════════════════ */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {isSubmitting
          ? 'Salvando…'
          : kind === 'expense'
            ? 'Lançar despesa'
            : 'Lançar receita'}
      </button>
    </form>
  );
}
