// ============================================================================
// WalletCardsTab - Aba "Cartões" da Carteira
// ============================================================================
// PROPÓSITO:
// - Lista todos os cartões de crédito com informações de ciclo e fatura
// - CRUD completo: Criar, Editar, Arquivar (soft delete)
// - Visualizar fatura atual (transações do ciclo)
//
// FUNCIONALIDADES:
// - Busca por nome (integrada com useWalletSearch)
// - Exibe fatura atual de cada cartão (valor + data de vencimento)
// - Drawer para criar/editar cartão
// - Drawer para ver detalhes da fatura (compras do ciclo)
//
// VISUAL:
// - Grid responsivo: 1/2/3 colunas
// - Cards com efeito glass
// - Loading skeletons
// - Empty states
// - Toast notifications
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import CardForm from '@/components/carteira/forms/CardForm';
import { useWalletSearch } from '@/stores/walletSearch';
import {
  useCardsList,
  useDeleteOrArchiveCard,
  useCurrentInvoices,
  useCurrentInvoiceDetail,
} from '@/hooks/finance/cards';
import { toast } from 'sonner';
import { formatBRL } from '@/lib/money';

export default function WalletCardsTab() {
  const { q, setQ } = useWalletSearch();
  const { data: cards = [], isLoading } = useCardsList(q);
  const { data: invoices = [] } = useCurrentInvoices();
  const removeMut = useDeleteOrArchiveCard();

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [viewCardId, setViewCardId] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────
  // Mapear faturas por card_id para acesso rápido
  // ──────────────────────────────────────────────────────────────────
  const invByCard = useMemo(() => {
    const map: Record<string, any> = {};
    (invoices || []).forEach((i) => (map[i.card_id] = i));
    return map;
  }, [invoices]);

  // ──────────────────────────────────────────────────────────────────
  // Hook para buscar detalhes da fatura (quando drawer abrir)
  // ──────────────────────────────────────────────────────────────────
  const invoiceDetail = useCurrentInvoiceDetail(viewCardId ?? undefined);

  // ──────────────────────────────────────────────────────────────────
  // Excluir/Arquivar cartão
  // ──────────────────────────────────────────────────────────────────
  function remove(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;

    toast.promise(removeMut.mutateAsync(id), {
      loading: 'Removendo…',
      success: 'Cartão removido/arquivado!',
      error: (e) => e.message || 'Erro ao remover',
    });
  }

  const hasData = (cards?.length ?? 0) > 0;

  return (
    <div className="pb-10">
      <CardGlass
        title="Cartões"
        actions={
          <div className="flex items-center gap-3">
            <div className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cartão"
                className="bg-transparent outline-none placeholder:text-[#9F9D9D]"
              />
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl2 px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90"
            >
              + Novo cartão
            </button>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[100px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((card) => {
              const inv = invByCard[card.id];
              return (
                <div
                  key={card.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  {/* Nome do cartão */}
                  <div className="text-white text-sm font-medium truncate mb-1">
                    {card.name}
                  </div>

                  {/* Informações de ciclo */}
                  <div className="text-[12px] text-[#CACACA]/80 mb-2">
                    Fecha dia {card.closing_day} · Vence dia {card.due_day}
                    {typeof card.limit_cents === 'number' &&
                      card.limit_cents > 0 && (
                        <> · Limite {formatBRL(card.limit_cents)}</>
                      )}
                  </div>

                  {/* Fatura atual (se houver) */}
                  {inv && (
                    <div className="text-[12px] text-[#CACACA]/90 mb-3 p-2 rounded bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span>Fatura atual:</span>
                        <span className="text-white font-medium">
                          {formatBRL(inv.amount_cents)}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-70 mt-0.5">
                        Vence em {inv.due_date}
                        {inv.days_to_due !== null && (
                          <> ({inv.days_to_due} dias)</>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {inv && (
                      <button
                        onClick={() => setViewCardId(card.id)}
                        className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 hover:text-white transition-all"
                      >
                        Ver fatura
                      </button>
                    )}
                    <button
                      onClick={() => setEditItem(card)}
                      className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 hover:text-white transition-all"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(card.id)}
                      className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-red-300 hover:bg-red-500/10 hover:border-red-400/30 transition-all"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Nenhum cartão"
            subtitle="Cadastre seus cartões para acompanhar as faturas automaticamente."
            action={
              <button
                onClick={() => setOpenCreate(true)}
                className="text-sm text-[#D4AF37] hover:underline"
              >
                Criar primeiro cartão
              </button>
            }
          />
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Criar novo cartão
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Novo cartão"
      >
        <CardForm onClose={() => setOpenCreate(false)} />
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Editar cartão
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar cartão"
      >
        {editItem && (
          <CardForm
            defaultValues={{
              id: editItem.id,
              name: editItem.name,
              closing_day: editItem.closing_day,
              due_day: editItem.due_day,
              limit_cents: editItem.limit_cents ?? 0,
            }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Ver fatura atual (compras do ciclo)
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!viewCardId}
        onClose={() => setViewCardId(null)}
        title="Fatura atual"
      >
        {!invoiceDetail.data ? (
          <p className="text-[#CACACA]">Carregando…</p>
        ) : (
          <div className="space-y-3">
            {/* Header da fatura */}
            <div className="text-sm text-[#CACACA] p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="font-medium text-white mb-1">
                {invoiceDetail.data.card_name}
              </div>
              <div className="text-xs opacity-80">
                Período: {invoiceDetail.data.cycle_start} →{' '}
                {invoiceDetail.data.cycle_end}
              </div>
            </div>

            {/* Lista de compras */}
            {(invoiceDetail.data.rows?.length ?? 0) === 0 ? (
              <div className="text-[#CACACA] text-center py-8 text-sm">
                Sem compras no ciclo atual.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {invoiceDetail.data.rows.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3 hover:bg-white/5 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm">
                        {r.description ?? '—'}
                      </div>
                      <div className="text-[12px] text-[#CACACA]/80 mt-0.5">
                        {r.occurred_at}
                        {r.category && <> · {r.category.name}</>}
                      </div>
                    </div>
                    <div className="text-red-300 font-medium ml-3 shrink-0">
                      {formatBRL(r.amount_cents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
