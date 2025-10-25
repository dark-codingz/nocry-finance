// ============================================================================
// WalletFixed - Aba "Contas Fixas"
// ============================================================================
// PROPÓSITO:
// - CRUD completo de contas fixas (despesas/receitas recorrentes)
// - Filtros: Tipo, Ativo/Inativo, Busca
// - Botão especial "Lançar fixas do mês"
// - Design glass responsivo
//
// FEATURES:
// - Lista em grid 1/2/3 colunas
// - Info: Nome, Tipo, Valor, Dia, Status (Ativa/Inativa)
// - Ações: Editar, Ativar/Desativar, Excluir
// - Lançamento mensal via RPC (idempotente)
// - Toast notifications
// ============================================================================

'use client';
import { useState } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import { useWalletSearch } from '@/stores/walletSearch';
import {
  useFixedList,
  useRemoveFixed,
  useToggleFixedActive,
  useLaunchFixed,
} from '@/hooks/finance/fixed';
import FixedForm from '@/components/carteira/forms/FixedForm';
import { toast } from 'sonner';
import { formatBRL } from '@/lib/money';
import { format } from 'date-fns';

export default function WalletFixed() {
  const { q } = useWalletSearch();
  const [type, setType] = useState<'all' | 'expense' | 'income'>('all');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  const { data = [], isLoading } = useFixedList({ q, type, active });
  const removeMut = useRemoveFixed();
  const toggleMut = useToggleFixedActive();
  const launchMut = useLaunchFixed();

  // ──────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────
  function remove(id: string, name: string) {
    if (!confirm(`Excluir conta fixa "${name}"?`)) return;

    toast.promise(removeMut.mutateAsync(id), {
      loading: 'Removendo…',
      success: 'Fixa removida!',
      error: (e) => (e as { message?: string }).message || 'Erro ao remover',
    });
  }

  function toggle(item: any) {
    toast.promise(
      toggleMut.mutateAsync({ id: item.id, active: !item.active }),
      {
        loading: 'Atualizando…',
        success: item.active ? 'Desativada' : 'Ativada',
        error: (e) => (e as { message?: string }).message || 'Erro',
      }
    );
  }

  function launchMonth() {
    const monthISO = format(new Date(), 'yyyy-MM-01');
    toast.promise(launchMut.mutateAsync({ monthISO }), {
      loading: 'Lançando fixas do mês…',
      success: 'Fixas lançadas com sucesso!',
      error: (e) => (e as { message?: string }).message || 'Erro ao lançar fixas',
    });
  }

  const hasData = (data?.length ?? 0) > 0;

  return (
    <div className="pb-10">
      <CardGlass
        title="Contas Fixas"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* ────────────────────────────────────────────────────────
                Filtros
                ──────────────────────────────────────────────────────── */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
            >
              <option value="all">Todas</option>
              <option value="expense">Despesas</option>
              <option value="income">Receitas</option>
            </select>

            <select
              value={active}
              onChange={(e) => setActive(e.target.value as any)}
              className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
            >
              <option value="all">Todas (ativo/inativo)</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>

            {/* ────────────────────────────────────────────────────────
                Lançar Fixas do Mês
                ──────────────────────────────────────────────────────── */}
            <button
              onClick={launchMonth}
              className="rounded-xl2 px-4 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 hover:bg-white/10 transition-colors"
            >
              Lançar fixas do mês
            </button>

            {/* ────────────────────────────────────────────────────────
                Nova Fixa
                ──────────────────────────────────────────────────────── */}
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl2 px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90 transition-opacity font-medium"
            >
              + Nova fixa
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
                className="h-[90px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : hasData ? (
          /* ════════════════════════════════════════════════════════════════
              Lista de Contas Fixas (Grid)
              ════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
              >
                {/* Info */}
                <div className="min-w-0 mb-3">
                  <div className="text-white text-sm font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-[#CACACA]/70 mt-1 space-x-1">
                    <span>
                      {item.type === 'expense' ? '💸 Despesa' : '💰 Receita'}
                    </span>
                    <span>·</span>
                    <span>dia {item.due_day}</span>
                    <span>·</span>
                    <span className="font-medium">
                      {formatBRL(item.amount_cents)}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditItem(item)}
                    className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 hover:text-white transition-all flex-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggle(item)}
                    className={`text-xs px-2 py-1 rounded-md border flex-1 transition-all ${
                      item.active
                        ? 'bg-green-500/10 border-green-400/30 text-green-300 hover:bg-green-500/20'
                        : 'bg-white/5 border-white/10 text-[#CACACA] hover:bg-white/10'
                    }`}
                  >
                    {item.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button
                    onClick={() => remove(item.id, item.name)}
                    className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-red-300 hover:bg-red-500/10 hover:border-red-400/30 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
              Empty State
              ════════════════════════════════════════════════════════════════ */
          <EmptyState
            title={
              q
                ? `Nenhuma fixa encontrada para "${q}"`
                : 'Nenhuma conta fixa cadastrada'
            }
            subtitle={
              q
                ? 'Tente outro termo de busca.'
                : 'Cadastre suas despesas/receitas recorrentes para lançar todo mês em 1 clique.'
            }
            action={
              !q ? (
                <button
                  onClick={() => setOpenCreate(true)}
                  className="text-sm text-[#D4AF37] hover:underline"
                >
                  Criar fixa
                </button>
              ) : undefined
            }
          />
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Criar Nova Fixa
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nova fixa"
      >
        <FixedForm onClose={() => setOpenCreate(false)} />
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Editar Fixa
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar fixa"
      >
        {editItem && (
          <FixedForm
            defaultValues={{
              id: editItem.id,
              name: editItem.name,
              type: editItem.type,
              amount_cents: editItem.amount_cents,
              due_day: editItem.due_day,
              account_id: editItem.account_id,
              card_id: editItem.card_id,
              category_id: editItem.category_id,
              active: !!editItem.active,
            }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Drawer>
    </div>
  );
}
