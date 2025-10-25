// ============================================================================
// WalletGeneral - Aba "Geral" da Carteira
// ============================================================================
// PROPÓSITO:
// - Visão geral: Últimas Transações + Contas + Cartões
// - Layout responsivo (8 col + 4 col em desktop)
// - Conectado com hooks reais (useWalletTransactions, useWalletAccounts, useWalletCards)
// ============================================================================

'use client';
import { useMemo } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import {
  useWalletAccounts,
  useWalletCards,
  useWalletTransactions,
} from '@/hooks/finance/wallet';
import { formatBRL } from '@/lib/money';

export default function WalletGeneral() {
  // ──────────────────────────────────────────────────────────────────
  // Dados (últimos 30 dias para transações)
  // ──────────────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const dfrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const dto = today.toISOString().slice(0, 10);

  const { data: recentTx = [], isLoading: loadingTx } = useWalletTransactions({
    date_from: dfrom,
    date_to: dto,
    limit: 10,
  });
  const { data: accounts = [], isLoading: loadingAccounts } =
    useWalletAccounts();
  const { data: cards = [], isLoading: loadingCards } = useWalletCards();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      {/* ════════════════════════════════════════════════════════════════
          Últimas Transações (8 colunas)
          ════════════════════════════════════════════════════════════════ */}
      <CardGlass title="Últimas Transações" className="lg:col-span-8 min-h-[320px]">
        {loadingTx ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : recentTx.length === 0 ? (
          <EmptyState
            title="Sem transações recentes"
            subtitle="Quando você lançar despesas ou receitas, aparecerão aqui."
          />
        ) : (
          <div className="space-y-2">
            {recentTx.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {t.description || 'Sem descrição'}
                  </div>
                  <div className="text-[#9F9D9D] text-xs mt-0.5">
                    {new Date(t.occurred_at).toLocaleDateString('pt-BR')} ·{' '}
                    {t.type === 'income'
                      ? 'Receita'
                      : t.type === 'expense'
                      ? 'Despesa'
                      : 'Transferência'}
                  </div>
                </div>
                <div
                  className={`text-sm font-medium ml-4 ${
                    t.type === 'income'
                      ? 'text-green-400'
                      : t.type === 'expense'
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                  {formatBRL(t.amount_cents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Contas + Cartões (4 colunas, empilhados)
          ════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4 grid grid-cols-1 gap-6">
        {/* Contas */}
        <CardGlass title="Contas" className="min-h-[150px]">
          {loadingAccounts ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              title="Nenhuma conta"
              subtitle="Configure suas contas bancárias, carteira, etc."
            />
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="text-white text-sm font-medium">
                    {a.name ?? 'Sem nome'}
                  </div>
                  {a.type && (
                    <div className="text-[#9F9D9D] text-xs mt-0.5 capitalize">
                      {a.type}
                    </div>
                  )}
                  {a.balance_cents !== undefined && (
                    <div className="text-[#D4AF37] text-xs font-medium mt-1">
                      {formatBRL(a.balance_cents)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardGlass>

        {/* Cartões */}
        <CardGlass title="Cartões" className="min-h-[150px]">
          {loadingCards ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <EmptyState
              title="Nenhum cartão"
              subtitle="Configure seus cartões de crédito."
            />
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="text-white text-sm font-medium">
                    {c.name ?? 'Sem nome'}
                  </div>
                  <div className="text-[#9F9D9D] text-xs mt-0.5">
                    Fechamento: {c.closing_day ?? '?'} · Vencimento:{' '}
                    {c.due_day ?? '?'}
                  </div>
                  {c.limit_cents !== undefined &&
                    c.limit_cents !== null &&
                    c.limit_cents > 0 && (
                      <div className="text-[#D4AF37] text-xs font-medium mt-1">
                        Limite: {formatBRL(c.limit_cents)}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardGlass>
      </div>
    </div>
  );
}

