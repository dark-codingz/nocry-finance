// ============================================================================
// components/analytics/filters/GlobalFilters.tsx - Container de Filtros Globais
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import FilterChips from '@/components/analytics/shared/FilterChips';
import ModeToggle from './ModeToggle';
import PeriodSelector from './PeriodSelector';
import AccountsFilter from './AccountsFilter';
import CardsFilter from './CardsFilter';
import CategoriesFilter from './CategoriesFilter';
import { useState } from 'react';

export default function GlobalFilters() {
  const { filters, resetFilters, setAccounts, setCards, setCategories } = useAnalyticsFilters();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRemoveFilter = (
    key: keyof Pick<typeof filters, 'accounts' | 'cards' | 'categories'>,
    value: string
  ) => {
    switch (key) {
      case 'accounts':
        setAccounts(filters.accounts.filter((id) => id !== value));
        break;
      case 'cards':
        setCards(filters.cards.filter((id) => id !== value));
        break;
      case 'categories':
        setCategories(filters.categories.filter((id) => id !== value));
        break;
    }
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Filtros</h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm text-[#9F9D9D] hover:text-white transition-colors"
          >
            {isExpanded ? '▲ Recolher' : '▼ Expandir'}
          </button>

          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm text-red-400 hover:text-red-300 underline transition-colors"
          >
            Resetar
          </button>
        </div>
      </div>

      {/* Filtros Principais (sempre visíveis) */}
      <div className="flex items-center gap-4 mb-4">
        <ModeToggle />
        <div className="w-64">
          <PeriodSelector />
        </div>
      </div>

      {/* Filter Chips */}
      <FilterChips
        filters={filters}
        onRemove={handleRemoveFilter}
        onClearAll={() => {
          setAccounts([]);
          setCards([]);
          setCategories([]);
        }}
      />

      {/* Filtros Avançados (expandíveis) */}
      {isExpanded && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
          <AccountsFilter />
          <CardsFilter />
          <CategoriesFilter />
        </div>
      )}
    </div>
  );
}

