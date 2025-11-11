// ============================================================================
// components/analytics/filters/ModeToggle.tsx - Toggle Caixa ↔ Competência
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import type { AnalyticsMode } from '@/lib/analytics/cache-keys';

export default function ModeToggle() {
  const { filters, setMode } = useAnalyticsFilters();

  const modes: { value: AnalyticsMode; label: string; icon: string }[] = [
    { value: 'cash', label: 'Caixa', icon: '💵' },
    { value: 'accrual', label: 'Competência', icon: '📅' },
  ];

  return (
    <div className="flex items-center gap-2 glass rounded-lg p-1">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setMode(mode.value)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              filters.mode === mode.value
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-[#9F9D9D] hover:text-white hover:bg-white/5'
            }
          `}
        >
          <span>{mode.icon}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

