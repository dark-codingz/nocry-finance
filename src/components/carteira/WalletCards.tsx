// ============================================================================
// WalletCards - Aba "Geral" da Carteira
// ============================================================================
// PROPÓSITO:
// - Visão geral: Últimas Transações + Contas + Cartões
// - Layout responsivo (8 col + 4 col em desktop)
// - Placeholder com EmptyState (serão substituídos por dados reais)
//
// FUTURO:
// - Plugar useRecentFinance para últimas transações
// - Plugar listAccounts para contas
// - Plugar listCards para cartões
// - Adicionar links para criar (abrir drawer de WalletActions)
// ============================================================================

'use client';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';

export default function WalletGeneral() {
  // ──────────────────────────────────────────────────────────────────
  // TODO: Conectar com hooks reais
  // ──────────────────────────────────────────────────────────────────
  // const { data: recentTx, isLoading: loadingTx } = useRecentFinance({ userId, limit: 10 });
  // const { data: accounts, isLoading: loadingAccounts } = useAccounts(userId);
  // const { data: cards, isLoading: loadingCards } = useCards(userId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      {/* ════════════════════════════════════════════════════════════════
          Últimas Transações (8 colunas)
          ════════════════════════════════════════════════════════════════ */}
      <CardGlass title="Últimas Transações" className="lg:col-span-8 min-h-[320px]">
        {/* TODO: Substituir por lista real de transações */}
        <EmptyState
          title="Sem transações recentes"
          subtitle="Quando você lançar despesas ou receitas, aparecerão aqui."
          action={
            <button className="text-sm text-[#D4AF37] hover:underline">
              Ver todas as transações
            </button>
          }
        />
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Contas + Cartões (4 colunas, empilhados)
          ════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4 grid grid-cols-1 gap-6">
        {/* Contas */}
        <CardGlass title="Contas" className="min-h-[150px]">
          {/* TODO: Substituir por lista real de contas */}
          <EmptyState
            title="Nenhuma conta"
            subtitle="Configure suas contas bancárias, carteira, etc."
            action={
              <button className="text-sm text-[#D4AF37] hover:underline">
                Criar conta
              </button>
            }
          />
        </CardGlass>

        {/* Cartões */}
        <CardGlass title="Cartões" className="min-h-[150px]">
          {/* TODO: Substituir por lista real de cartões */}
          <EmptyState
            title="Nenhum cartão"
            subtitle="Configure seus cartões de crédito."
            action={
              <button className="text-sm text-[#D4AF37] hover:underline">
                Criar cartão
              </button>
            }
          />
        </CardGlass>
      </div>
    </div>
  );
}



