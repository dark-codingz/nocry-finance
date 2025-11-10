// ============================================================================
// PayInvoiceModal - Modal para Pagar Fatura de Cartão
// ============================================================================
// PROPÓSITO:
// - Permitir pagamento total ou parcial de faturas
// - Validar valores e saldos
// - Integrar com API /api/invoices/pay
//
// PROPS:
// - card_id: ID do cartão
// - invoice_balance_cents: Saldo aberto da fatura
// - onClose: Callback para fechar o modal
// - onSuccess: Callback após pagamento bem-sucedido
//
// VALIDAÇÕES:
// - amount > 0
// - amount <= invoice_balance_cents
// - source_account_id obrigatório
// - paid_at obrigatório
// ============================================================================

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '@/lib/money';
import CurrencyInputIncremental from '@/components/form/CurrencyInputIncremental';
import { useWalletAccounts } from '@/hooks/finance/wallet';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
interface PayInvoiceModalProps {
  isOpen: boolean;
  card_id: string;
  card_name: string;
  invoice_balance_cents: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface PayInvoiceFormData {
  amount_cents: number;
  source_account_id: string;
  paid_at: string; // YYYY-MM-DD
  notes: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function PayInvoiceModal({
  isOpen,
  card_id,
  card_name,
  invoice_balance_cents,
  onClose,
  onSuccess,
}: PayInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar contas do usuário
  const { data: accounts = [], isLoading: loadingAccounts } = useWalletAccounts();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PayInvoiceFormData>({
    defaultValues: {
      amount_cents: invoice_balance_cents, // Pré-preencher com valor total
      source_account_id: '',
      paid_at: new Date().toISOString().split('T')[0], // Hoje
      notes: '',
    },
  });

  const amount_cents = watch('amount_cents');

  // ──────────────────────────────────────────────────────────────────
  // Atalhos de valor (25%, 50%, 75%, 100%)
  // ──────────────────────────────────────────────────────────────────
  const setPercentage = (percentage: number) => {
    const value = Math.round((invoice_balance_cents * percentage) / 100);
    setValue('amount_cents', value);
  };

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: PayInvoiceFormData) => {
    setIsSubmitting(true);

    try {
      // Validações adicionais
      if (data.amount_cents <= 0) {
        toast.error('Valor deve ser maior que zero');
        setIsSubmitting(false);
        return;
      }

      if (data.amount_cents > invoice_balance_cents) {
        toast.error(`Valor excede saldo da fatura (${formatBRL(invoice_balance_cents)})`);
        setIsSubmitting(false);
        return;
      }

      if (!data.source_account_id) {
        toast.error('Selecione a conta de origem');
        setIsSubmitting(false);
        return;
      }

      // Chamar API
      const response = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id,
          amount_cents: data.amount_cents,
          source_account_id: data.source_account_id,
          paid_at: data.paid_at,
          notes: data.notes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      // Sucesso! Invalidar todas as queries relacionadas
      toast.success('Pagamento realizado com sucesso!');
      
      // Force refetch de todas as faturas e métricas
      if (typeof window !== 'undefined') {
        window.location.reload(); // Força reload completo para garantir atualização
      }
      
      reset();
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('[PayInvoiceModal] Erro:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Fechar modal
  // ──────────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0A0A0A] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Pagar Fatura</h2>
              <p className="text-sm text-[#9F9D9D] mt-1">{card_name}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#CACACA]" />
            </button>
          </div>

          {/* Saldo da fatura */}
          <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-[#9F9D9D] uppercase tracking-wider mb-1">
              Saldo em aberto
            </p>
            <p className="text-2xl font-bold text-white">
              {formatBRL(invoice_balance_cents)}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Valor a pagar */}
            <div>
              <label className="block text-sm text-[#CACACA] mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Valor a pagar *
              </label>
              <CurrencyInputIncremental
                value={amount_cents}
                onValueChange={(cents) => setValue('amount_cents', cents)}
                placeholder="R$ 0,00"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                disabled={isSubmitting}
              />
              
              {/* Atalhos */}
              <div className="mt-2 flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPercentage(pct)}
                    disabled={isSubmitting}
                    className="flex-1 py-1.5 text-xs rounded-lg border border-white/10 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors disabled:opacity-50"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {errors.amount_cents && (
                <p className="text-xs text-red-400 mt-1">{errors.amount_cents.message}</p>
              )}
            </div>

            {/* Conta de origem */}
            <div>
              <label className="block text-sm text-[#CACACA] mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Conta de origem *
              </label>
              <select
                {...register('source_account_id', { required: 'Selecione uma conta' })}
                disabled={isSubmitting || loadingAccounts}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                    {typeof acc.balance_cents === 'number' && 
                      ` - ${formatBRL(acc.balance_cents)}`
                    }
                  </option>
                ))}
              </select>
              {errors.source_account_id && (
                <p className="text-xs text-red-400 mt-1">{errors.source_account_id.message}</p>
              )}
            </div>

            {/* Data do pagamento */}
            <div>
              <label className="block text-sm text-[#CACACA] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data do pagamento *
              </label>
              <input
                type="date"
                {...register('paid_at', { required: 'Data obrigatória' })}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
              {errors.paid_at && (
                <p className="text-xs text-red-400 mt-1">{errors.paid_at.message}</p>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm text-[#CACACA] mb-2">
                Observações (opcional)
              </label>
              <textarea
                {...register('notes')}
                disabled={isSubmitting}
                placeholder="Ex: Pagamento parcial da fatura"
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4AF37]/50 resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || amount_cents <= 0 || amount_cents > invoice_balance_cents}
                className="flex-1 py-3 rounded-lg bg-[#D4AF37] text-black font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

