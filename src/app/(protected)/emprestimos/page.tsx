// ============================================================================
// Página: Empréstimos
// ============================================================================
// PROPÓSITO:
// - Listar empréstimos com saldos e filtros
// - Criar, editar, registrar eventos (pagamento, aporte, juros)
// - Aplicar juros automáticos do período
// - Quitar empréstimos
//
// ESTRUTURA:
// - KPIs no topo (Total emprestado, Total recebido, Juros, Saldo)
// - Filtros (Status + Busca por pessoa)
// - Cards por empréstimo com progresso e ações
// - Drawers para formulários (criar, eventos, config, detalhes)
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import {
  useLoansList,
  useCloseLoan,
  type LoanSummary,
} from '@/hooks/finance/loans';
import { LOAN_EVENT_TYPES } from '@/domain/loans/eventTypes';
import { useWalletSearch } from '@/stores/walletSearch';
import Drawer from '@/components/ui/Drawer';
import CardGlass from '@/components/ui/CardGlass';
import EmptyState from '@/components/ui/EmptyState';
import LoanForm from '@/components/emprestimos/LoanForm';
import LoanEventForm from '@/components/emprestimos/LoanEventForm';
import LoanConfigForm from '@/components/emprestimos/LoanConfigForm';
import LoanDetails from '@/components/emprestimos/LoanDetails';
import { formatBRL } from '@/lib/money';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Plus,
  DollarSign,
  ArrowUpCircle,
  Gift,
  Settings,
  Eye,
  CheckCircle,
  Search,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function LoansPage() {
  const { q, setQ } = useWalletSearch();
  const [status, setStatus] = useState<'all' | 'active' | 'closed'>('active');

  // Drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [eventDrawer, setEventDrawer] = useState<{
    loan: LoanSummary;
    type: typeof LOAN_EVENT_TYPES.REPAYMENT | typeof LOAN_EVENT_TYPES.TOPUP | typeof LOAN_EVENT_TYPES.INTEREST;
  } | null>(null);
  const [configDrawer, setConfigDrawer] = useState<LoanSummary | null>(null);
  const [detailsDrawer, setDetailsDrawer] = useState<LoanSummary | null>(null);

  // Dados
  const { data: loans = [], isLoading } = useLoansList({ status, q });
  const closeMut = useCloseLoan();

  // ──────────────────────────────────────────────────────────────────────
  // KPIs (Agregados)
  // ──────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const principal = loans.reduce((acc, l) => acc + l.principal_cents, 0);
    const paid = loans.reduce((acc, l) => acc + l.paid_cents, 0);
    const interest = loans.reduce((acc, l) => acc + l.interest_cents, 0);
    const balance = loans.reduce((acc, l) => acc + l.balance_cents, 0);

    return { principal, paid, interest, balance };
  }, [loans]);

  // ──────────────────────────────────────────────────────────────────────
  // Ações
  // ──────────────────────────────────────────────────────────────────────
  function handleClose(loan: LoanSummary) {
    if (!confirm(`Tem certeza que deseja quitar o empréstimo de ${loan.person_name}?`)) {
      return;
    }

    toast.promise(closeMut.mutateAsync({ id: loan.id }), {
      loading: 'Quitando...',
      success: 'Empréstimo quitado!',
      error: (e) => e.message || 'Erro ao quitar',
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Renderização
  // ──────────────────────────────────────────────────────────────────────
  const hasLoans = loans.length > 0;

  return (
    <div className="px-6 pt-5 pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl md:text-3xl font-semibold mb-2">
          Empréstimos
        </h1>
        <p className="text-[#9F9D9D] text-sm">
          Controle completo de empréstimos e recebimentos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Emprestado */}
        <div className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-[#9F9D9D] text-xs">Emprestado</span>
          </div>
          <div className="text-white text-lg font-semibold">
            {formatBRL(kpis.principal)}
          </div>
        </div>

        {/* Total Recebido */}
        <div className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-[#9F9D9D] text-xs">Recebido</span>
          </div>
          <div className="text-green-400 text-lg font-semibold">
            {formatBRL(kpis.paid)}
          </div>
        </div>

        {/* Juros Acumulados */}
        <div className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Percent className="h-4 w-4 text-orange-400" />
            </div>
            <span className="text-[#9F9D9D] text-xs">Juros</span>
          </div>
          <div className="text-orange-400 text-lg font-semibold">
            {formatBRL(kpis.interest)}
          </div>
        </div>

        {/* Saldo Aberto */}
        <div className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <span className="text-[#9F9D9D] text-xs">Saldo</span>
          </div>
          <div
            className={`text-lg font-semibold ${
              kpis.balance > 0 ? 'text-white' : 'text-[#CACACA]'
            }`}
          >
            {formatBRL(kpis.balance)}
          </div>
        </div>
      </div>

      {/* Filtros + Ações */}
      <CardGlass
        title="Meus Empréstimos"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 focus:border-white/20 transition-colors"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="closed">Quitados</option>
            </select>

            {/* Busca */}
            <div className="rounded-xl2 px-3 py-2 text-sm bg-white/5 text-[#CACACA] border border-white/10 flex items-center gap-2">
              <Search className="h-4 w-4" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar pessoa"
                className="bg-transparent outline-none placeholder:text-[#9F9D9D] w-32"
              />
            </div>

            {/* Novo Empréstimo */}
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-xl2 px-4 py-2 text-sm bg-[#D4AF37] text-black border border-[#D4AF37] hover:opacity-90 transition-opacity font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Empréstimo
            </button>
          </div>
        }
      >
        {/* Lista de Empréstimos */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[200px] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : hasLoans ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loans.map((loan) => {
              const progress =
                loan.principal_cents > 0
                  ? Math.min(100, (loan.paid_cents / loan.principal_cents) * 100)
                  : 0;

              return (
                <div
                  key={loan.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium text-lg">
                        {loan.person_name}
                      </h3>
                      <p className="text-[#9F9D9D] text-xs mt-0.5">
                        {new Date(loan.started_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {loan.status === 'closed' && (
                      <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium">
                        Quitado
                      </span>
                    )}
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                    <div>
                      <div className="text-[#9F9D9D]">Emprestado</div>
                      <div className="text-white font-medium mt-0.5">
                        {formatBRL(loan.principal_cents)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#9F9D9D]">Recebido</div>
                      <div className="text-green-400 font-medium mt-0.5">
                        {formatBRL(loan.paid_cents)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#9F9D9D]">Saldo</div>
                      <div
                        className={`font-medium mt-0.5 ${
                          loan.balance_cents > 0
                            ? 'text-red-400'
                            : 'text-[#CACACA]'
                        }`}
                      >
                        {formatBRL(loan.balance_cents)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#9F9D9D]">Progresso</span>
                      <span className="text-white font-medium">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-green-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    {loan.status === 'active' && (
                      <>
                        <button
                          onClick={() =>
                            setEventDrawer({ loan, type: LOAN_EVENT_TYPES.REPAYMENT })
                          }
                          className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1"
                          title="Registrar pagamento"
                        >
                          <DollarSign className="h-3 w-3" />
                          Pagamento
                        </button>
                        <button
                          onClick={() => setEventDrawer({ loan, type: LOAN_EVENT_TYPES.TOPUP })}
                          className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-1"
                          title="Novo aporte"
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          Aporte
                        </button>
                        <button
                          onClick={() =>
                            setEventDrawer({ loan, type: LOAN_EVENT_TYPES.INTEREST })
                          }
                          className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-1"
                          title="Adicionar juros"
                        >
                          <Gift className="h-3 w-3" />
                          Juros
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setConfigDrawer(loan)}
                      className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-white/5 text-[#CACACA] border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                      title="Editar configuração"
                    >
                      <Settings className="h-3 w-3" />
                      Config
                    </button>
                    <button
                      onClick={() => setDetailsDrawer(loan)}
                      className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-white/5 text-[#CACACA] border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                      title="Ver detalhes"
                    >
                      <Eye className="h-3 w-3" />
                      Detalhes
                    </button>

                    {loan.status === 'active' && loan.balance_cents <= 0 && (
                      <button
                        onClick={() => handleClose(loan)}
                        className="flex-1 min-w-[120px] text-xs px-3 py-2 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1"
                        title="Quitar empréstimo"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              q
                ? `Nenhum empréstimo encontrado para "${q}"`
                : 'Nenhum empréstimo ainda'
            }
            subtitle={
              q
                ? 'Tente outro termo de busca.'
                : 'Crie seu primeiro empréstimo para começar a controlar.'
            }
            action={
              !q ? (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="text-sm text-[#D4AF37] hover:underline"
                >
                  Criar primeiro empréstimo
                </button>
              ) : undefined
            }
          />
        )}
      </CardGlass>

      {/* Drawers */}
      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo Empréstimo"
      >
        <LoanForm onClose={() => setCreateOpen(false)} />
      </Drawer>

      <Drawer
        open={!!eventDrawer}
        onClose={() => setEventDrawer(null)}
        title={
          eventDrawer?.type === LOAN_EVENT_TYPES.REPAYMENT
            ? 'Registrar Pagamento'
            : eventDrawer?.type === LOAN_EVENT_TYPES.TOPUP
            ? 'Novo Aporte'
            : 'Adicionar Juros'
        }
      >
        {eventDrawer && (
          <LoanEventForm
            loanId={eventDrawer.loan.id}
            type={eventDrawer.type}
            onClose={() => setEventDrawer(null)}
          />
        )}
      </Drawer>

      <Drawer
        open={!!configDrawer}
        onClose={() => setConfigDrawer(null)}
        title="Editar Configuração"
      >
        {configDrawer && (
          <LoanConfigForm
            loan={configDrawer}
            onClose={() => setConfigDrawer(null)}
          />
        )}
      </Drawer>

      <Drawer
        open={!!detailsDrawer}
        onClose={() => setDetailsDrawer(null)}
        title="Detalhes do Empréstimo"
      >
        {detailsDrawer && <LoanDetails loan={detailsDrawer} />}
      </Drawer>
    </div>
  );
}
