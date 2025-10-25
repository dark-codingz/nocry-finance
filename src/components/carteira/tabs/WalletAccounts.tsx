// ============================================================================
// WalletAccounts - Aba "Contas"
// ============================================================================
// PROPÓSITO:
// - CRUD completo de contas bancárias/carteiras
// - Listagem com nome e observações (opcional)
// - Busca por nome (integrada com walletSearch store)
// - Design: Cards glass, layout responsivo em grid
// - Feedback: Toast notifications após cada ação
//
// FEATURES:
// - Listagem em grid responsivo (1/2/3 colunas)
// - Busca por nome (integrada com walletSearch store)
// - Botões: Editar (abre drawer), Excluir (soft delete)
// - Loading skeletons durante carregamento
// - Empty state quando não há dados
//
// HOOKS:
// - useAccountsList: Lista com busca
// - useArchiveAccount: Soft delete (archived=true)
// - useWalletSearch: Busca compartilhada
// ============================================================================

'use client';
import { useState } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import AccountForm from '@/components/carteira/forms/AccountForm';
import {
  useAccountsList,
  useArchiveAccount,
} from '@/hooks/finance/accounts';
import { useWalletSearch } from '@/stores/walletSearch';
import { toast } from 'sonner';

export default function WalletAccounts() {
  const { q } = useWalletSearch();
  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  // Buscar contas com filtro de busca
  const { data = [], isLoading } = useAccountsList(q);

  // Mutation para arquivar
  const archiveMut = useArchiveAccount();

  const hasData = data.length > 0;

  // ──────────────────────────────────────────────────────────────────
  // Arquivar conta (soft delete)
  // ──────────────────────────────────────────────────────────────────
  function archive(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja arquivar a conta "${name}"?`)) return;

    toast.promise(archiveMut.mutateAsync(id), {
      loading: 'Arquivando…',
      success: 'Conta arquivada!',
      error: (e) => (e as { message?: string }).message || 'Erro ao arquivar',
    });
  }

  return (
    <div className="pb-10">
      <CardGlass
        title="Contas"
        actions={
          <div className="flex items-center gap-3">
            {/* ────────────────────────────────────────────────────────
                Botão Nova Conta
                ──────────────────────────────────────────────────────── */}
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl2 px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90 transition-opacity font-medium"
            >
              + Nova conta
            </button>
          </div>
        }
      >
        {/* ════════════════════════════════════════════════════════════════
            Loading Skeletons
            ════════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[80px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : hasData ? (
          /* ════════════════════════════════════════════════════════════════
              Lista de Contas (Grid)
              ════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
              >
                {/* Info da Conta */}
                <div className="min-w-0 mb-3">
                  <div className="text-white text-sm font-medium truncate">
                    {acc.name}
                  </div>
                  {acc.notes && (
                    <div className="text-[11px] text-[#CACACA]/70 mt-1 line-clamp-2">
                      {acc.notes}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditItem(acc)}
                    className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 hover:text-white transition-all flex-1"
                    title="Editar conta"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => archive(acc.id, acc.name)}
                    className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-red-300 hover:bg-red-500/10 hover:border-red-400/30 transition-all flex-1"
                    title="Arquivar conta"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
              Empty State (sem dados)
              ════════════════════════════════════════════════════════════════ */
          <EmptyState
            title={
              q ? `Nenhuma conta encontrada para "${q}"` : 'Nenhuma conta'
            }
            subtitle={
              q
                ? 'Tente outro termo de busca.'
                : 'Crie contas (carteira, banco, etc.) para lançar transações.'
            }
            action={
              !q ? (
                <button
                  onClick={() => setOpenCreate(true)}
                  className="text-sm text-[#D4AF37] hover:underline"
                >
                  Criar primeira conta
                </button>
              ) : undefined
            }
          />
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Criar Nova Conta
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nova conta"
      >
        <AccountForm onClose={() => setOpenCreate(false)} />
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Editar Conta
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar conta"
      >
        {editItem && (
          <AccountForm
            defaultValues={{
              id: editItem.id,
              name: editItem.name,
              notes: editItem.notes,
            }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Drawer>
    </div>
  );
}
