// ============================================================================
// SdmProjectedCard - Card de SDM Projetado (REGIME DE CAIXA)
// ============================================================================
// PROPÓSITO:
// - Calcular e exibir o SDM (Saldo Disponível no Mês) projetado
// - Fórmula SIMPLIFICADA: Saldo Líquido - Fixas Restantes
//
// FÓRMULA:
// SDM = net_cents - fixed_remaining_cents
//
// IMPORTANTE - REGIME DE CAIXA:
// - Compras de cartão NÃO são saídas de caixa (não contam no Saldo Líquido)
// - Fatura aberta NÃO é deduzida do SDM
// - Apenas quando a fatura for PAGA, o pagamento impacta o Saldo Líquido
// - Evita "double counting" e reflete disponibilidade real de caixa
//
// ORIGEM DOS DADOS:
// - net_cents: Saldo Líquido do mês (Entradas - Saídas em dinheiro)
// - fixed_remaining_cents: Fixas não lançadas (compromissos pendentes)
//
// VISUAL:
// - Efeito glass
// - Valor principal em branco (destaque)
// - Breakdown com os 2 componentes em fonte menor
// ============================================================================

'use client';

import {
  useSaldoLiquido,
  useFixedRemaining,
} from '@/hooks/finance/sdm';
import { formatBRL } from '@/lib/money';
import { DollarSign } from 'lucide-react';

export default function SdmProjectedCard() {
  const { data: saldoLiquido, isLoading: isLoadingLiquido } = useSaldoLiquido();
  const { data: fixedRemaining, isLoading: isLoadingFixed } = useFixedRemaining();

  // ──────────────────────────────────────────────────────────────────
  // Valores com fallback (sempre renderiza, mesmo sem dados)
  // ──────────────────────────────────────────────────────────────────
  const net = saldoLiquido?.net_cents ?? 0;
  const fixedRest = fixedRemaining?.fixed_remaining_cents ?? 0;

  // ──────────────────────────────────────────────────────────────────
  // Log de Diagnóstico (apenas em desenvolvimento)
  // ──────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[SDM] Breakdown:', {
      net_cents: net,
      fixed_remaining_cents: fixedRest,
      sdm_calculated: net - fixedRest,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Cálculo do SDM (REGIME DE CAIXA)
  // ──────────────────────────────────────────────────────────────────
  // IMPORTANTE: Fatura aberta NÃO é deduzida porque:
  // - Compras de cartão NÃO são saídas de caixa (regime de caixa)
  // - Fatura só impacta quando for PAGA (pagamento vira saída)
  // - SDM = disponibilidade real após fixas pendentes
  const sdm = net - fixedRest;

  // ──────────────────────────────────────────────────────────────────
  // Loading State Sutil (opcional, não bloqueia renderização)
  // ──────────────────────────────────────────────────────────────────
  const isLoading = isLoadingLiquido || isLoadingFixed;

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
      </div>

      {/* 
        Comentário de Implementação:
        SDM = Saldo Líquido - Fixas Restantes (REGIME DE CAIXA).
        Fatura de cartão NÃO é deduzida aqui porque compras não são saídas de caixa.
        Apenas quando a fatura for PAGA, o pagamento impacta o saldo líquido.
      */}
    </div>
  );
}

