// ============================================================================
// Página: Crypto
// ============================================================================
// PROPÓSITO:
// - Módulo de gerenciamento de criptomoedas (em desenvolvimento)
// - Restrita a usuários da whitelist de administradores
//
// FUNCIONALIDADES PLANEJADAS:
// - Conectar carteiras (MetaMask, WalletConnect, etc.)
// - Visualizar saldo em cripto e conversão para BRL
// - Histórico de transações on-chain
// - Acompanhamento de PnL (Profit and Loss)
// - DCA (Dollar Cost Averaging) automático
// - Integração com DEX e CEX
//
// STATUS: 🚧 Em Desenvolvimento
// ============================================================================

'use client';

import DevWarning from '@/components/ui/DevWarning';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Bitcoin, Wallet, TrendingUp, ArrowUpDown } from 'lucide-react';

export default function CryptoPage() {
  const { isAdmin, isLoading } = useIsAdmin();

  // ─────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[#CACACA]">Carregando...</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Guard: Apenas admins podem acessar (página em desenvolvimento)
  // ─────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return <DevWarning />;
  }

  // ─────────────────────────────────────────────────────────────────────
  // TODO: Implementar conteúdo de Crypto
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 pt-5 pb-10">
      {/* ═════════════════════════════════════════════════════════════════
          Header
          ═════════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <h1 className="text-white text-2xl md:text-3xl font-semibold mb-2">
          Crypto
        </h1>
        <p className="text-[#9F9D9D] text-sm">
          Gerenciamento de carteiras e investimentos em criptomoedas
        </p>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          Placeholder com preview das funcionalidades planejadas
          ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card: Carteiras */}
        <div className="glass rounded-xl2 border border-white/10 p-6">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold mb-2">Carteiras</h3>
          <p className="text-[#9F9D9D] text-sm">
            Conecte e gerencie suas wallets
          </p>
        </div>

        {/* Card: Saldo */}
        <div className="glass rounded-xl2 border border-white/10 p-6">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
            <Bitcoin className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold mb-2">Saldo</h3>
          <p className="text-[#9F9D9D] text-sm">
            Acompanhe seus ativos em cripto
          </p>
        </div>

        {/* Card: PnL */}
        <div className="glass rounded-xl2 border border-white/10 p-6">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold mb-2">PnL</h3>
          <p className="text-[#9F9D9D] text-sm">
            Lucros e perdas realizados
          </p>
        </div>

        {/* Card: DCA */}
        <div className="glass rounded-xl2 border border-white/10 p-6">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
            <ArrowUpDown className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold mb-2">DCA</h3>
          <p className="text-[#9F9D9D] text-sm">
            Aportes automáticos recorrentes
          </p>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          Mensagem principal
          ═════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center">
            <Bitcoin className="w-8 h-8 text-[#D4AF37]" />
          </div>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          Módulo Crypto em Breve
        </h2>
        <p className="text-[#CACACA] max-w-md mx-auto">
          Estamos desenvolvendo um módulo completo para gerenciamento de criptomoedas,
          incluindo carteiras conectadas, saldo consolidado, PnL, aportes e DCA automático.
        </p>
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-[#9F9D9D] text-sm">
            🚧 Funcionalidades planejadas: Carteiras • Saldo • Transações • PnL • DCA • DEX/CEX
          </p>
        </div>
      </div>
    </div>
  );
}



