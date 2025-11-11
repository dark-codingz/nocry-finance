// ============================================================================
// components/analytics/filters/AccountsFilter.tsx - Multi-select de Contas
// ============================================================================

'use client';

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters';
import { useAccounts } from '@/hooks/finance/lookups';

export default function AccountsFilter() {
  const { filters, setAccounts } = useAnalyticsFilters();
  const { data: accounts = [], isLoading } = useAccounts();

  const handleToggle = (accountId: string) => {
    if (filters.accounts.includes(accountId)) {
      setAccounts(filters.accounts.filter((id) => id !== accountId));
    } else {
      setAccounts([...filters.accounts, accountId]);
    }
  };

  const handleSelectAll = () => {
    if (filters.accounts.length === accounts.length) {
      setAccounts([]);
    } else {
      setAccounts(accounts.map((a) => a.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm text-[#9F9D9D]">Contas</label>
        <div className="h-10 glass rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[#9F9D9D]">Contas</label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {filters.accounts.length === accounts.length ? 'Limpar' : 'Todas'}
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto glass rounded-lg p-2">
        {accounts.map((account) => (
          <label
            key={account.id}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={filters.accounts.includes(account.id)}
              onChange={() => handleToggle(account.id)}
              className="rounded border-white/20 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-white">{account.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

