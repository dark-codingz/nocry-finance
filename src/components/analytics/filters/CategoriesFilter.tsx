// ============================================================================
// components/analytics/filters/CategoriesFilter.tsx - Multi-select de Categorias
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import { useCategories } from '@/hooks/finance/lookups';

export default function CategoriesFilter() {
  const { filters, setCategories } = useAnalyticsFilters();
  const { data: categories = [], isLoading } = useCategories();

  const handleToggle = (categoryId: string) => {
    if (filters.categories.includes(categoryId)) {
      setCategories(filters.categories.filter((id) => id !== categoryId));
    } else {
      setCategories([...filters.categories, categoryId]);
    }
  };

  const handleSelectAll = () => {
    if (filters.categories.length === categories.length) {
      setCategories([]);
    } else {
      setCategories(categories.map((c) => c.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm text-[#9F9D9D]">Categorias</label>
        <div className="h-10 glass rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[#9F9D9D]">Categorias</label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {filters.categories.length === categories.length ? 'Limpar' : 'Todas'}
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto glass rounded-lg p-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={filters.categories.includes(category.id)}
              onChange={() => handleToggle(category.id)}
              className="rounded border-white/20 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-white">{category.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

