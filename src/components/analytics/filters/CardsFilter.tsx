// ============================================================================
// components/analytics/filters/CardsFilter.tsx - Multi-select de Cartões
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import { useCards } from '@/hooks/finance/lookups';

export default function CardsFilter() {
  const { filters, setCards } = useAnalyticsFilters();
  const { data: cards = [], isLoading } = useCards();

  const handleToggle = (cardId: string) => {
    if (filters.cards.includes(cardId)) {
      setCards(filters.cards.filter((id) => id !== cardId));
    } else {
      setCards([...filters.cards, cardId]);
    }
  };

  const handleSelectAll = () => {
    if (filters.cards.length === cards.length) {
      setCards([]);
    } else {
      setCards(cards.map((c) => c.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm text-[#9F9D9D]">Cartões</label>
        <div className="h-10 glass rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[#9F9D9D]">Cartões</label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {filters.cards.length === cards.length ? 'Limpar' : 'Todos'}
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto glass rounded-lg p-2">
        {cards.map((card) => (
          <label
            key={card.id}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={filters.cards.includes(card.id)}
              onChange={() => handleToggle(card.id)}
              className="rounded border-white/20 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-white">{card.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

