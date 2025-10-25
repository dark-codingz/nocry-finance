// ============================================================================
// WalletCategories - Aba "Categorias"
// ============================================================================
// PROPÓSITO:
// - CRUD completo de categorias (Listar, Criar, Editar, Arquivar)
// - Filtros: Tipo (Todas/Despesas/Receitas), Busca por nome
// - Design: Cards glass, layout responsivo em grid
// - Feedback: Toast notifications após cada ação
//
// FEATURES:
// - Listagem em grid responsivo (1/2/3 colunas)
// - Filtro por tipo (select)
// - Busca por nome (integrada com walletSearch store)
// - Botões: Editar (abre drawer), Excluir (soft delete)
// - Loading skeletons durante carregamento
// - Empty state quando não há dados
//
// HOOKS:
// - useCategoriesList: Lista com filtros
// - useArchiveCategory: Soft delete (archived=true)
// - useWalletSearch: Busca compartilhada
// ============================================================================

'use client';
import { useState } from 'react';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import CategoryForm from '@/components/carteira/forms/CategoryForm';
import {
  useCategoriesList,
  useArchiveCategory,
} from '@/hooks/finance/categories';
import { useWalletSearch } from '@/stores/walletSearch';
import { toast } from 'sonner';

type FilterType = 'all' | 'expense' | 'income';

export default function WalletCategories() {
  const { q } = useWalletSearch();
  const [type, setType] = useState<FilterType>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  // Buscar categorias com filtros
  const { data = [], isLoading } = useCategoriesList({ q, type });

  // Mutation para arquivar
  const archiveMut = useArchiveCategory();

  const hasData = data.length > 0;

  // ──────────────────────────────────────────────────────────────────
  // Arquivar categoria (soft delete)
  // ──────────────────────────────────────────────────────────────────
  function archive(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;

    toast.promise(archiveMut.mutateAsync(id), {
      loading: 'Excluindo…',
      success: 'Categoria excluida!',
      error: (e) => e.message || 'Erro ao excluir',
    });
  }

  return (
    <div className="pb-10">
      <CardGlass
        title="Categorias"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* ────────────────────────────────────────────────────────
                Filtro por Tipo
                ──────────────────────────────────────────────────────── */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FilterType)}
              className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20 transition-colors"
            >
              <option value="all">Todas</option>
              <option value="expense">Despesas</option>
              <option value="income">Receitas</option>
            </select>

            {/* ────────────────────────────────────────────────────────
                Botão Nova Categoria
                ──────────────────────────────────────────────────────── */}
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl2 px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90 transition-opacity font-medium"
            >
              + Nova categoria
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
                className="h-[72px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : hasData ? (
          /* ════════════════════════════════════════════════════════════════
              Lista de Categorias (Grid)
              ════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
              >
                {/* Info da Categoria */}
                <div>
                  <div className="text-white text-sm font-medium">
                    {cat.name}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-[#CACACA]/70 mt-0.5">
                    {cat.type === 'expense' ? '💸 DESPESA' : '💰 RECEITA'}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditItem(cat)}
                    className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[#CACACA] hover:bg-white/10 hover:text-white transition-all"
                    title="Editar categoria"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => archive(cat.id, cat.name)}
                    className="text-xs px-3 py-1 rounded-md bg-white/5 border border-white/10 text-red-300 hover:bg-red-500/10 hover:border-red-400/30 transition-all"
                    title="Arquivar categoria"
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
            title={q ? `Nenhuma categoria encontrada para "${q}"` : 'Nenhuma categoria'}
            subtitle={
              q
                ? 'Tente outro termo de busca.'
                : 'Crie categorias para organizar suas despesas e receitas.'
            }
            action={
              !q ? (
                <button
                  onClick={() => setOpenCreate(true)}
                  className="text-sm text-[#D4AF37] hover:underline"
                >
                  Criar primeira categoria
                </button>
              ) : undefined
            }
          />
        )}
      </CardGlass>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Criar Nova Categoria
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nova categoria"
      >
        <CategoryForm onClose={() => setOpenCreate(false)} />
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          Drawer: Editar Categoria
          ════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar categoria"
      >
        {editItem && (
          <CategoryForm
            defaultValues={{
              id: editItem.id,
              name: editItem.name,
              type: editItem.type,
            }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

