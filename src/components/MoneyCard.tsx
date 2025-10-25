// /src/components/MoneyCard.tsx
'use client';

// Propósito: Um componente de UI reutilizável para exibir
// um valor monetário de forma destacada.

import { formatBRL } from '@/lib/money';

interface MoneyCardProps {
  title: string;
  valueInCents: number;
  description?: string;
  isLoading?: boolean;
}

export default function MoneyCard({ title, valueInCents, description, isLoading = false }: MoneyCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex-1">
      <h2 className="text-lg font-semibold text-gray-600 mb-2">{title}</h2>
      {isLoading ? (
        <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4"></div>
      ) : (
        <p className="text-3xl font-bold text-gray-800">
          {formatBRL(valueInCents)}
        </p>
      )}
      {description && !isLoading && (
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}



