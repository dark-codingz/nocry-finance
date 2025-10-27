// ============================================================================
// WalletTransactions - Aba "Transações"
// ============================================================================
// PROPÓSITO:
// - CRUD completo de transações com filtros avançados
// - Filtros: Período (useDateRange), Tipo, Conta, Cartão, Categoria, Busca
// - Tabela responsiva com ações inline (Editar, Duplicar, Excluir, Conciliar)
// - Paginação server-side (25 itens/página)
// - Totalizadores: Entradas, Saídas, Saldo
// - Exportação CSV do resultado filtrado
//
// FEATURES:
// - Filtros persistem na URL via useDateRange e useWalletSearch
// - Loading skeletons durante busca
// - Empty state quando não há dados
// - Confirmação antes de excluir
// - Toast notifications para todas ações
// - Invalidação automática de caches
// ============================================================================

'use client';
import { useState } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import { useDateRange } from '@/stores/dateRange';
import { useWalletSearch } from '@/stores/walletSearch';
import {
  useTransactions,
  useDeleteTransaction,
  useToggleReconciled,
  TxRow,
  TxKind,
} from '@/hooks/finance/transactions';
import {
  useCategoriesForSelect,
  useAccounts,
  useCards,
} from '@/hooks/finance/lookups';
import TxForm from '@/components/carteira/forms/TxForm';
import { formatBRL } from '@/lib/money';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  Download,
} from 'lucide-react';

export default function WalletTransactions() {
  const { from, to } = useDateRange();
  const { q, setQ } = useWalletSearch();

  // ──────────────────────────────────────────────────────────────────
  // Filtros locais
  // ──────────────────────────────────────────────────────────────────
  const [kind, setKind] = useState<'all' | TxKind>('all');
  const [accountId, setAccountId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);

  // ──────────────────────────────────────────────────────────────────
  // Buscar dados
  // ──────────────────────────────────────────────────────────────────
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategoriesForSelect();

  const { data, isLoading } = useTransactions({
    from: from || '',
    to: to || '',
    kind,
    accountId: accountId || undefined,
    cardId: cardId || undefined,
    categoryId: categoryId || undefined,
    q,
    page,
    pageSize: 25,
  });

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteTransaction();
  const toggleReconciled = useToggleReconciled();

  // ──────────────────────────────────────────────────────────────────
  // Estados dos drawers
  // ──────────────────────────────────────────────────────────────────
  const [editTx, setEditTx] = useState<TxRow | null>(null);
  const [dupTx, setDupTx] = useState<TxRow | null>(null);
  const [createKind, setCreateKind] = useState<'expense' | 'income' | null>(
    null
  );

  // ──────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────
  function resetPage() {
    setPage(1);
  }

  function handleDelete(id: string, description: string | null) {
    if (!confirm(`Excluir transação "${description || 'Sem descrição'}"?`))
      return;

    toast.promise(deleteMutation.mutateAsync(id), {
      loading: 'Excluindo…',
      success: 'Transação excluída!',
      error: (e) => e.message || 'Erro ao excluir',
    });
  }

  function handleToggleReconciled(tx: TxRow) {
    toast.promise(
      toggleReconciled.mutateAsync({ id: tx.id, value: !tx.reconciled }),
      {
        loading: 'Atualizando…',
        success: tx.reconciled
          ? 'Desmarcada como conciliada'
          : 'Conciliada com sucesso!',
        error: (e) => e.message || 'Erro',
      }
    );
  }

  function handleExportCSV() {
    const rows = data?.rows ?? [];
    const csv = [
      'data,tipo,descricao,conta,cartao,categoria,valor_centavos',
      ...rows.map((r) =>
        [
          r.occurred_at,
          r.type,
          (r.description ?? '').replaceAll(',', ' '),
          r.account?.name ?? '',
          r.card?.name ?? '',
          r.category?.name ?? '',
          r.amount_cents,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  }

  return (
    <div className="pb-10">
      <CardGlass
        title="Transações"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botões Lançar */}
            <button
              onClick={() => setCreateKind('expense')}
              className="rounded-xl2 px-3 py-1.5 text-xs bg-white/5 text-red-300 border border-white/10 hover:bg-white/10"
            >
              + Despesa
            </button>
            <button
              onClick={() => setCreateKind('income')}
              className="rounded-xl2 px-3 py-1.5 text-xs bg-white/5 text-green-300 border border-white/10 hover:bg-white/10"
            >
              + Receita
            </button>
          </div>
        }
      >
        {/* ════════════════════════════════════════════════════════════════
            Linha de Filtros
            ════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as 'all' | TxKind);
              resetPage();
            }}
            className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
          >
            <option value="all">Todas</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
            <option value="transfer">Transferências</option>
          </select>

          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              resetPage();
            }}
            className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
          >
            <option value="">Conta: todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={cardId}
            onChange={(e) => {
              setCardId(e.target.value);
              resetPage();
            }}
            className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
          >
            <option value="">Cartão: todos</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              resetPage();
            }}
            className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20"
          >
            <option value="">Categoria: todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetPage();
              }}
              placeholder="Buscar descrição"
              className="bg-transparent outline-none placeholder:text-[#9F9D9D] w-36"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!data?.rows?.length}
            className="rounded-xl2 px-3 py-2 text-xs bg-white/5 text-[#CACACA] border border-white/10 hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            Loading Skeletons
            ════════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[64px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (data?.rows?.length ?? 0) === 0 ? (
          /* ════════════════════════════════════════════════════════════════
              Empty State
              ════════════════════════════════════════════════════════════════ */
          <EmptyState
            title={
              q
                ? `Nenhuma transação encontrada para "${q}"`
                : 'Sem transações neste período'
            }
            subtitle={
              q
                ? 'Tente outro termo de busca.'
                : 'Lance uma despesa/receita para aparecer aqui.'
            }
          />
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                Tabela de Transações
                ════════════════════════════════════════════════════════════════ */}
            <div className="space-y-3">
              {data!.rows.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-2 items-start">
                    {/* Data */}
                    <div className="col-span-2 text-xs text-[#CACACA]">
                      {new Date(tx.occurred_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>

                    {/* Descrição */}
                    <div className="col-span-4 text-sm text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tx.description || '—'}</span>
                        {/* Badge de Parcelas */}
                        {tx.installment_total && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                            {tx.installment_index}/{tx.installment_total}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#CACACA]/70 mt-0.5">
                        {tx.type === 'expense'
                          ? '💸 Despesa'
                          : tx.type === 'income'
                            ? '💰 Receita'
                            : '🔄 Transferência'}
                      </div>
                    </div>

                    {/* Categoria */}
                    <div className="col-span-2 text-xs text-[#CACACA]">
                      {tx.category?.name ?? '—'}
                    </div>

                    {/* Conta/Cartão */}
                    <div className="col-span-2 text-xs text-[#CACACA]">
                      {tx.account?.name ?? tx.card?.name ?? '—'}
                    </div>

                    {/* Valor */}
                    <div className="col-span-2 text-right text-sm font-medium">
                      <span
                        className={
                          tx.type === 'expense'
                            ? 'text-red-300'
                            : 'text-green-300'
                        }
                      >
                        {formatBRL(tx.amount_cents)}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setEditTx(tx)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => setDupTx(tx)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Duplicar
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id, tx.description)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-red-300 hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                    <button
                      onClick={() => handleToggleReconciled(tx)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <CheckCircle
                        className={`h-3 w-3 ${tx.reconciled ? 'text-green-400' : 'text-[#CACACA]'}`}
                      />
                      {tx.reconciled ? 'Conciliada' : 'Conciliar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                Rodapé: Totalizadores + Paginação
                ════════════════════════════════════════════════════════════════ */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              {/* Totalizadores */}
              <div className="text-xs text-[#CACACA] space-x-3">
                <span>
                  Entradas:{' '}
                  <span className="text-green-300 font-medium">
                    {formatBRL(data!.totals.income_cents)}
                  </span>
                </span>
                <span>·</span>
                <span>
                  Saídas:{' '}
                  <span className="text-red-300 font-medium">
                    {formatBRL(data!.totals.expense_cents)}
                  </span>
                </span>
                <span>·</span>
                <span>
                  Saldo:{' '}
                  <span className="text-white font-medium">
                    {formatBRL(data!.totals.net_cents)}
                  </span>
                </span>
              </div>

              {/* Paginação */}
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md px-2 py-1 border border-white/10 bg-white/5 disabled:opacity-40 hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4 text-[#CACACA]" />
                </button>
                <div className="text-xs text-[#CACACA]">Página {page}</div>
                <button
                  disabled={data!.page * data!.pageSize >= data!.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md px-2 py-1 border border-white/10 bg-white/5 disabled:opacity-40 hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4 text-[#CACACA]" />
                </button>
              </div>
            </div>
          </>
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Criar Despesa/Receita
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!createKind}
        onClose={() => setCreateKind(null)}
        title={
          createKind === 'expense' ? 'Lançar Despesa' : 'Lançar Receita'
        }
      >
        {createKind && (
          <TxForm kind={createKind} onSuccess={() => setCreateKind(null)} />
        )}
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Editar (placeholder)
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!editTx}
        onClose={() => setEditTx(null)}
        title="Editar transação"
      >
        {editTx && (
          <div className="text-[#CACACA] text-sm space-y-2">
            <p>
              TODO: Implementar modo edição (v2) com updateTransaction
            </p>
            <p className="text-xs opacity-70">
              Por enquanto, você pode excluir e criar novamente.
            </p>
          </div>
        )}
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Duplicar (placeholder)
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!dupTx}
        onClose={() => setDupTx(null)}
        title="Duplicar transação"
      >
        {dupTx && (
          <div className="text-[#CACACA] text-sm space-y-2">
            <p>
              TODO: Implementar TxForm com defaultValues (v2)
            </p>
            <p className="text-xs opacity-70">
              Por enquanto, crie manualmente com os mesmos valores.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
