"use client";
import { formatBRL } from '@/lib/money';
import type { FinanceActivity } from '@/services/recentActivity';

export default function RecentFinance({ items, loading, error }:{ items: FinanceActivity[]; loading:boolean; error?: unknown }) {
  if (loading) return <div className="text-sm text-gray-500">Carregando atividades…</div>;
  const msg = error instanceof Error ? error.message : (error ? String(error) : null);
  
  return (
    <div className="space-y-2">
      {msg && <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md">{msg}</div>}
      {items.length === 0 ? (
        <div className="text-sm text-center text-gray-500 py-4">Sem atividades recentes para os filtros selecionados.</div>
      ) : (
        <ul className="divide-y border rounded-md bg-white">
          {items.map(it => (
            <li key={it.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {it.kind === 'expense' ? '💸' : it.kind === 'income' ? '💰' : '🔁'}
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-medium text-gray-800">
                    {it.description || (it.kind === 'expense' ? 'Despesa' : it.kind === 'income' ? 'Receita' : 'Transferência')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(`${it.occurredAtISO}T12:00:00`).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${it.kind==='expense' ? 'text-red-600' : it.kind==='income' ? 'text-green-600' : 'text-slate-600'}`}>
                {it.kind==='expense' ? '-' : it.kind==='income' ? '+' : ''} {formatBRL(it.amountCents)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



