// ============================================================================
// SdmProjectedCard - Card de SDM Projetado
// ============================================================================
// PROPÓSITO:
// - Calcular e exibir o SDM (Saldo Disponível no Mês) projetado
// - Fórmula: Saldo Líquido - Fixas Restantes - Faturas do Mês
//
// FÓRMULA:
// SDM = net_cents - fixed_remaining_cents - invoices_due_this_month_cents
//
// IMPORTANTE - SOBRE DOUBLE COUNTING:
// Se as compras de cartão já foram reconhecidas como despesas no momento
// da compra, subtrair o valor total da fatura pode ocasionar 'double counting'
// do ponto de vista de resultado contábil. Aqui estamos tratando SDM como
// disponibilidade de caixa projetada (saídas futuras ainda não ocorridas),
// por isso incluímos faturas do mês como compromisso de pagamento.
//
// ORIGEM DOS DADOS:
// - net_cents: pf_month_summary (Entradas - Saídas)
// - fixed_remaining_cents: pf_fixed_remaining_current_month (Fixas não lançadas)
// - invoices_due_this_month_cents: pf_card_invoices_due_this_month (Faturas a vencer)
//
// VISUAL:
// - Efeito glass
// - Valor principal em branco (destaque)
// - Breakdown com os 3 componentes em fonte menor
// ============================================================================

'use client';

import {
  useSaldoLiquido,
  useFixedRemaining,
  useCurrentInvoicesTotal,
} from '@/hooks/finance/sdm';
import { formatBRL } from '@/lib/money';
import { DollarSign } from 'lucide-react';

export default function SdmProjectedCard() {
  const { data: saldoLiquido, isLoading: isLoadingLiquido } = useSaldoLiquido();
  const { data: fixedRemaining, isLoading: isLoadingFixed } = useFixedRemaining();
  const { data: invoicesTotalData, isLoading: isLoadingInvoices } = useCurrentInvoicesTotal();

  // ──────────────────────────────────────────────────────────────────
  // Valores com fallback (sempre renderiza, mesmo sem dados)
  // ──────────────────────────────────────────────────────────────────
  const net = saldoLiquido?.net_cents ?? 0;
  const fixedRest = fixedRemaining?.fixed_remaining_cents ?? 0;
  const invoicesAmount = invoicesTotalData?.invoices_current_total_cents ?? 0;

  // ──────────────────────────────────────────────────────────────────
  // Log de Diagnóstico (apenas em desenvolvimento)
  // ──────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[SDM] Breakdown:', {
      net_cents: net,
      fixed_remaining_cents: fixedRest,
      invoices_current_total_cents: invoicesAmount,
      sdm_calculated: net - fixedRest - invoicesAmount,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Cálculo do SDM
  // ──────────────────────────────────────────────────────────────────
  // NOTA: Este SDM assume faturas como compromisso de caixa.
  // Se sua contabilidade já registrou a despesa no ato da compra,
  // esse cartão é para "cash flow" (disponibilidade projetada).
  // Evite usar SDM como resultado contábil para não duplicar despesas.
  const sdm = net - fixedRest - invoicesAmount;

  // ──────────────────────────────────────────────────────────────────
  // Loading State Sutil (opcional, não bloqueia renderização)
  // ──────────────────────────────────────────────────────────────────
  const isLoading = isLoadingLiquido || isLoadingFixed || isLoadingInvoices;

  return (
    <div className={`glass rounded-xl p-5 border border-white/10 ${isLoading ? 'opacity-70' : ''}`}>
      {/* Header com ícone */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            sdm > 0 ? 'bg-green-500/20' : sdm < 0 ? 'bg-red-500/20' : 'bg-nocry-goldDark'
          }`}
        >
          <DollarSign
            className={`w-5 h-5 ${
              sdm > 0
                ? 'text-green-400'
                : sdm < 0
                  ? 'text-red-400'
                  : 'text-nocry-gold'
            }`}
          />
        </div>
        <div>
          <p className="text-xs text-nocry-muted uppercase tracking-wider">
            SDM (Projetado)
          </p>
        </div>
      </div>

      {/* Valor Principal */}
      <div className="mt-1 text-2xl text-white font-bold">{formatBRL(sdm)}</div>

      {/* Breakdown (Fórmula) */}
      <div className="mt-2 text-[11px] text-[#CACACA]/85 leading-relaxed">
        <div className="flex items-center gap-1 flex-wrap">
          <span>Líquido:</span>
          <span className="text-white">{formatBRL(net)}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-red-400">−</span>
          <span>Fixas restantes:</span>
          <span className="text-white">{formatBRL(fixedRest)}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-red-400">−</span>
          <span>Fatura atual:</span>
          <span className="text-white">{formatBRL(invoicesAmount)}</span>
        </div>
      </div>

      {/* 
        Comentário de Implementação:
        Este SDM assume faturas como compromisso de caixa futuro.
        Se despesas já foram contabilizadas na compra, use para "cash flow".
      */}
    </div>
  );
}

