// ============================================================================
// SaldoLiquidoCard - Card de Saldo Líquido (Realizado por Período)
// ============================================================================
// PROPÓSITO:
// - Exibir o saldo líquido filtrado (Entradas - Saídas)
// - Respeita o filtro de datas do Dashboard (from/to)
// - Atualiza automaticamente quando o filtro muda
//
// DADOS:
// - Busca de pf_net_by_period (RPC SQL)
// - total_income_cents: Total de receitas no período
// - total_expense_cents: Total de despesas no período
// - net_cents: Saldo líquido (income - expense)
//
// VISUAL:
// - Efeito glass
// - Valor principal em branco
// - Breakdown com entradas e saídas em fonte menor
// - Info do período filtrado no rodapé
// ============================================================================

'use client';
 
import { useNetByPeriod } from '@/hooks/analytics';
import { useDateRange } from '@/stores/dateRange';
import { formatBRL } from '@/lib/money';
import { TrendingUp } from 'lucide-react';

export default function SaldoLiquidoCard() {
  // ──────────────────────────────────────────────────────────────────
  // Pegar período do filtro do Dashboard
  // ──────────────────────────────────────────────────────────────────
  const { from, to } = useDateRange();
  
  // Garantir defaults se null (store sempre deve ter valores, mas TypeScript exige)
  const safeFrom = from || new Date().toISOString().slice(0, 10);
  const safeTo = to || new Date().toISOString().slice(0, 10);

  // ──────────────────────────────────────────────────────────────────
  // Buscar dados do período filtrado
  // ──────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useNetByPeriod(safeFrom, safeTo);

  // ──────────────────────────────────────────────────────────────────
  // Valores com fallback (sempre renderiza, mesmo sem dados)
  // ──────────────────────────────────────────────────────────────────
  const totalIncome = data?.total_income_cents ?? 0;
  const totalExpense = data?.total_expense_cents ?? 0;
  const netCents = data?.net_cents ?? 0;

  // ──────────────────────────────────────────────────────────────────
  // Formatar período para exibição (ex: "01/01 → 31/01")
  // ──────────────────────────────────────────────────────────────────
  const formatPeriodShort = (dateFrom: string, dateTo: string) => {
    try {
      const [, , dayFrom] = dateFrom.split('-');
      const [, monthFrom] = dateFrom.split('-');
      const [, , dayTo] = dateTo.split('-');
      const [, monthTo] = dateTo.split('-');
      return `${dayFrom}/${monthFrom} → ${dayTo}/${monthTo}`;
    } catch {
      return '';
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Tratamento de erro otimizado (early return)
  // ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="glass rounded-xl p-5 border border-red-500/30 bg-red-500/5">
        {/* Header com ícone de erro */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20">
            <TrendingUp className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-nocry-muted uppercase tracking-wider">
              Saldo Líquido (Filtrado)
            </p>
          </div>
        </div>

        {/* Mensagem de erro detalhada */}
        <div className="text-red-300 text-sm">
          Erro ao carregar saldo: {(error as Error)?.message ?? 'erro desconhecido'}
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-xl p-5 border border-white/10 ${isLoading ? 'opacity-70' : ''}`}>
      {/* Header com ícone */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            netCents > 0 ? 'bg-green-500/20' : 'bg-nocry-goldDark'
          }`}
        >
          <TrendingUp
            className={`w-5 h-5 ${
              netCents > 0 ? 'text-green-400' : 'text-nocry-gold'
            }`}
          />
        </div>
        <div>
          <p className="text-xs text-nocry-muted uppercase tracking-wider">
            Saldo Líquido (Filtrado)
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Estados: Loading, Conteúdo
          ══════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 rounded bg-white/5 animate-pulse" />
          <div className="h-4 rounded bg-white/5 animate-pulse w-3/4" />
        </div>
      ) : (
        <>
          {/* Valor Principal */}
          <div className="mt-1 text-2xl text-white font-bold">
            {formatBRL(netCents)}
          </div>

          {/* Breakdown (Entradas e Saídas) */}
          <div className="mt-2 text-[12px] text-[#CACACA]/85 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="text-green-400">↑</span>
              Entradas: {formatBRL(totalIncome)}
            </span>
            <span className="text-[#CACACA]/50">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-red-400">↓</span>
              Saídas: {formatBRL(totalExpense)}
            </span>
          </div>

          {/* Info do Período */}
          <div className="mt-2 text-[11px] text-[#9F9D9D]">
            Período: {formatPeriodShort(safeFrom, safeTo)}
          </div>
        </>
      )}
    </div>
  );
}

