// ============================================================================
// components/analytics/shared/FilterChips.tsx - Chips de Filtros Aplicados
// ============================================================================

'use client';

import type { AnalyticsFilters } from '@/lib/analytics/cache-keys';

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type FilterChipsProps = {
  filters: AnalyticsFilters;
  onRemove: (key: keyof Pick<AnalyticsFilters, 'accounts' | 'cards' | 'categories'>, value: string) => void;
  onClearAll?: () => void;
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ────────────────────────────────────────────────────────────────────────────

export default function FilterChips({
  filters,
  onRemove,
  onClearAll,
}: FilterChipsProps) {
  const hasFilters =
    filters.accounts.length > 0 ||
    filters.cards.length > 0 ||
    filters.categories.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm text-[#9F9D9D]">Filtros:</span>

      {/* Contas */}
      {filters.accounts.map((accountId) => (
        <Chip
          key={`account-${accountId}`}
          label={`Conta ${accountId.slice(0, 8)}...`}
          onRemove={() => onRemove('accounts', accountId)}
        />
      ))}

      {/* Cartões */}
      {filters.cards.map((cardId) => (
        <Chip
          key={`card-${cardId}`}
          label={`Cartão ${cardId.slice(0, 8)}...`}
          onRemove={() => onRemove('cards', cardId)}
        />
      ))}

      {/* Categorias */}
      {filters.categories.map((categoryId) => (
        <Chip
          key={`category-${categoryId}`}
          label={`Categoria ${categoryId.slice(0, 8)}...`}
          onRemove={() => onRemove('categories', categoryId)}
        />
      ))}

      {/* Limpar Todos */}
      {onClearAll && (
        <button
          onClick={onClearAll}
          className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 underline transition-colors"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CHIP INDIVIDUAL
// ────────────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-sm text-white">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 text-[#9F9D9D] hover:text-white transition-colors"
        aria-label="Remover filtro"
      >
        ×
      </button>
    </div>
  );
}

