// src/components/RecentActivity.tsx
'use client';

import type { RecentActivityItem } from '@/types/recentActivity';
import { formatBRL } from '@/lib/money';

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

const KIND_CONFIG = {
  expense:  { icon: '💸', color: 'text-red-500', sign: '-' },
  income:   { icon: '💰', color: 'text-green-500', sign: '+' },
  transfer: { icon: '🔁', color: 'text-gray-500', sign: '' },
  sale:     { icon: '🛒', color: 'text-blue-500', sign: '+' },
  spend:    { icon: '📣', color: 'text-orange-500', sign: '-' },
  work:     { icon: '⏱️', color: 'text-purple-500', sign: '' },
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-md">
        <p>Sem atividades recentes.</p>
        <p className="text-sm mt-1">Quando você registrar uma transação, ela aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <ul className="divide-y divide-gray-200">
        {activities.map((item) => {
          const config = KIND_CONFIG[item.kind] || KIND_CONFIG.transfer;
          const date = new Date(item.occurredAtISO);

          return (
            <li key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-4">{config.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {item.kind === 'work' && item.meta?.duration_minutes && ` (${item.meta.duration_minutes} min)`}
                  </p>
                </div>
              </div>

              {typeof item.amountCents === 'number' && (
                <p className={`font-bold text-lg ${config.color}`}>
                  {config.sign}{formatBRL(item.amountCents)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}




