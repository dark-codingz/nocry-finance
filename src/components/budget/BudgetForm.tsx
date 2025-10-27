// ============================================================================
// BudgetForm - Wrapper para BudgetInlineForm (Carteira)
// ============================================================================
// PROPÓSITO:
// - Wrapper fino que busca orçamento existente e passa para BudgetInlineForm
// - Mantém compatibilidade com código existente da Carteira
// - Lógica unificada em BudgetInlineForm (reutilizável)
// ============================================================================

'use client';

import { useMemo } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { getBudget } from '@/services/budgets';
import BudgetInlineForm from '@/components/shared/BudgetInlineForm';

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────
interface BudgetFormProps {
  onSaved?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function BudgetForm({ onSaved }: BudgetFormProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  // Mês atual (YYYY-MM)
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // ──────────────────────────────────────────────────────────────────
  // Buscar orçamento atual
  // ──────────────────────────────────────────────────────────────────
  const { data: currentBudget, isLoading } = useQuery({
    queryKey: ['budget', monthKey, userId],
    queryFn: () => getBudget(supabase, userId!, monthKey),
    enabled: !!userId,
    staleTime: 10_000,
  });

  // ──────────────────────────────────────────────────────────────────
  // Renderizar BudgetInlineForm com orçamento carregado
  // ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-20 bg-white/5 rounded-lg" />
        <div className="h-12 bg-white/5 rounded-lg" />
      </div>
    );
  }

  return (
    <BudgetInlineForm
      defaultMonthKey={monthKey}
      defaultAmountCents={currentBudget?.amountCents ?? 0}
      onSaved={onSaved}
      showMonthLabel={true}
      submitLabel="Salvar orçamento"
      autoFocus={true}
    />
  );
}

