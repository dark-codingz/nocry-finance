// ============================================================================
// components/analytics/drilldown/DynamicTable.tsx - Tabela Dinâmica
// ============================================================================

'use client';

import { formatBRL } from '@/lib/money';
import { useState } from 'react';

type Row = {
  [key: string]: any;
};

type DynamicTableProps = {
  data: Row[];
  columns: string[];
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
};

export default function DynamicTable({
  data,
  columns,
  isLoading = false,
  onPageChange,
  currentPage = 1,
  totalPages = 1,
}: DynamicTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    
    // Formatação por tipo
    if (key.includes('_cents')) {
      return formatBRL(value / 100);
    }
    if (key.includes('_pct')) {
      return `${value.toFixed(1)}%`;
    }
    if (key.includes('_date')) {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-[#9F9D9D]">Carregando...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-[#9F9D9D]">Nenhum dado encontrado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-sm font-medium text-[#9F9D9D] cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col}</span>
                    {sortColumn === col && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-3 text-sm text-white"
                  >
                    {formatValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9F9D9D]">
            Página {currentPage} de {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm glass rounded border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            >
              Anterior
            </button>

            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm glass rounded border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

