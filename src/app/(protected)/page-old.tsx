// /app/page.tsx
"use client";

// ============================================================================
// DASHBOARD PRINCIPAL - NoCry Finance
// ============================================================================
// Valores monetários sempre em centavos (number).
// CurrencyInput converte BRL textual ↔ centavos e o form usa number.
// Invalidação via React Query ao salvar orçamento (sem reload de página).
// ============================================================================

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { formatBRL, parseBRL } from '@/lib/money';
import { useMonthParam } from '@/hooks/useMonthParam';
import { useFinanceDashboard } from '@/hooks/useFinanceDashboard';
import { useDigitalDashboard } from '@/hooks/useDigitalDashboard';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import RecentActivity from '@/components/RecentActivity';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { setBudget } from '@/services/budgets';
import * as loansService from '@/services/loans';
import type { InvoiceRow } from '@/types/financeDashboard';
import type { OfferRankingRow } from '@/types/digitalDashboard';

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Schemas e Tipos
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

// IMPORTANTE: Valores monetários sempre em centavos (number).
// CurrencyInput converte BRL textual ↔ centavos e o form usa number.
const budgetSchema = z.object({
  budgetCents: z.number().int().nonnegative('Orçamento deve ser maior ou igual a zero'),
});
type BudgetFormData = z.infer<typeof budgetSchema>;

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Subcomponents
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

const Card = ({ title, value, subtitle, tooltip }: { title: string; value: string; subtitle?: string; tooltip?: string }) => (
    <div className="bg-white p-6 rounded-lg shadow-md relative group">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        {tooltip && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs bg-gray-700 text-white rounded-md px-2 py-1">{tooltip}</span>
            </div>
        )}
    </div>
);

const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-8 bg-gray-300 rounded w-1/2 mt-3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
    </div>
);

// Skeleton para a lista de atividades
const ActivityListSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
            </div>
        ))}
    </div>
);

// Helper para converter o erro 'unknown' do TanStack Query para uma string segura para renderização.
const useErrorMessage = (err: unknown) => useMemo(() => {
    if (!err) return null;
    if (err instanceof Error) return err.message;
    try { return JSON.stringify(err); } catch { return String(err); }
}, [err]);

// Componente de Card de Orçamento com edição inline
// Invalidação via React Query ao salvar orçamento.
const BudgetCard = ({ month, budgetCents, budgetSpentCents, budgetProgressPct }: { 
    month: string;
    budgetCents: number;
    budgetSpentCents: number;
    budgetProgressPct: number;
}) => {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: { budgetCents: budgetCents || 0 },
        mode: 'onChange',
    });

    // Mutation para salvar o orçamento
    const saveBudget = useMutation({
        mutationFn: async (data: BudgetFormData) => {
            if (!userId) throw new Error('Usuário não autenticado');
            // Garantir que é number
            const cents = Number(data.budgetCents) || 0;
            await setBudget(supabase, userId, { monthStr: month, amountCents: cents });
            return cents;
        },
        onSuccess: async (savedCents) => {
            // 1) Atualização otimista do cache
            queryClient.setQueryData(
                ['finance-dashboard', userId, month],
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        summary: {
                            ...old.summary,
                            budgetCents: savedCents,
                        },
                    };
                }
            );
            
            // 2) Invalida para refetch correto
            await queryClient.invalidateQueries({ queryKey: ['finance-dashboard', userId, month] });
            
            setIsEditing(false);
            setToast({ type: 'success', message: 'Orçamento salvo com sucesso!' });
            setTimeout(() => setToast(null), 3000);
        },
        onError: (error: any) => {
            setToast({ type: 'error', message: error?.message ?? 'Falha ao salvar orçamento' });
            setTimeout(() => setToast(null), 5000);
        },
    });

    const onSubmit = (data: BudgetFormData) => {
        saveBudget.mutate(data);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Orçamento do Mês</h3>
            
            {/* Toast de feedback */}
            {toast && (
                <div className={`mt-2 p-2 rounded text-sm ${toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {toast.message}
                </div>
            )}
            
            {!isEditing ? (
                <>
                    <p className="text-3xl font-bold mt-2">
                        {budgetCents > 0 ? formatBRL(budgetCents) : 'Não definido'}
                    </p>
                    {budgetCents > 0 && (
                        <>
                            <p className="text-sm text-gray-400 mt-1">
                                Gasto: {formatBRL(budgetSpentCents)} ({budgetProgressPct.toFixed(1)}%)
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                    className={`h-2 rounded-full ${budgetProgressPct > 90 ? 'bg-red-500' : budgetProgressPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(100, budgetProgressPct)}%` }}
                                />
                            </div>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-indigo-600 hover:underline mt-2 block"
                    >
                        {budgetCents > 0 ? 'Editar orçamento' : 'Definir orçamento'}
                    </button>
                </>
            ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-2 space-y-2">
                    <Controller
                        control={form.control}
                        name="budgetCents"
                        render={({ field }) => (
                            <CurrencyInput
                                id="budget"
                                value={field.value ?? 0}
                                onChange={(nextCents) => field.onChange(nextCents)}
                                className="w-full p-2 border rounded-md"
                                placeholder="R$ 0,00"
                            />
                        )}
                    />
                    {form.formState.errors.budgetCents && (
                        <p className="text-red-500 text-xs">{form.formState.errors.budgetCents.message}</p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saveBudget.isPending}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                            {saveBudget.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsEditing(false); form.reset(); }}
                            className="px-3 py-1 bg-gray-400 text-white text-sm rounded-md hover:bg-gray-500"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};


// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Main Page Component
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

export default function DashboardPage() {
    // 1. Hooks são sempre chamados na mesma ordem, no topo.
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;
    const { month, setMonth } = useMonthParam();
    const { data: financeData, isLoading: isFinanceLoading, error: financeError } = useFinanceDashboard(month);
    const { data: digitalData, isLoading: isDigitalLoading, error: digitalError } = useDigitalDashboard(month);
    const { data: activities, isLoading: isActivityLoading, error: activityError } = useRecentActivity();
    
    // Query para empréstimos
    const { data: loans, isLoading: isLoansLoading } = useQuery({
        queryKey: ['loans', userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return [];
            return await loansService.listLoansWithBalance(supabase, userId);
        },
    });

    // 2. Erros são convertidos para strings seguras para JSX.
    const financeErrorMsg = useErrorMessage(financeError);
    const digitalErrorMsg = useErrorMessage(digitalError);
    const activityErrorMsg = useErrorMessage(activityError);
    
    // LOGS DE DIAGNÓSTICO
    console.log('[dashboard] digitalData', digitalData);
    
    // 3. Lógica derivada e desestruturação vêm depois, usando os dados garantidamente não-nulos dos hooks.
    const derivedFinanceData = useMemo(() => {
        if (!financeData) return { sdmCents: 0, canSpendTodayCents: 0, budgetCents: 0, budgetSpentCents: 0, budgetLeftCents: 0, budgetProgressPct: 0, biggestInvoice: null, nextBill: null };

        const { summary, invoices, nextBill } = financeData;
        
        // SDM: Saldo Disponível no Mês (baseado em receitas - despesas - fixas)
        const sdmCents = (summary.totalIncomeCents - summary.totalExpenseCents) - summary.fixedBillsThisMonthCents;
        
        // Cálculos de Orçamento
        // Nota: Usamos o orçamento (se definido) para calcular quanto pode gastar hoje.
        // Este é um cálculo simplificado. No futuro, podemos refinar com categorias específicas.
        const budgetCents = summary.budgetCents || 0;
        const budgetSpentCents = summary.totalExpenseCents; // Despesas já realizadas no mês
        const budgetLeftCents = Math.max(0, budgetCents - budgetSpentCents);
        const budgetProgressPct = budgetCents > 0 ? Math.min(100, (budgetSpentCents / budgetCents) * 100) : 0;
        
        // Dias restantes no mês (incluindo hoje)
        const now = new Date();
        const today = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = Math.max(1, daysInMonth - today + 1);
        
        // "Pode gastar hoje": se há orçamento, usa ele; senão, usa SDM.
        const canSpendTodayCents = budgetCents > 0 
            ? Math.max(0, Math.floor(budgetLeftCents / daysLeft))
            : Math.max(0, Math.floor((sdmCents - summary.totalExpenseCents) / daysLeft));
        
        const biggestInvoice = (invoices && invoices.length > 0)
            ? invoices.reduce((max, inv) => (inv.amount_cents > max.amount_cents ? inv : max))
            : null;
            
        return { 
            sdmCents, 
            canSpendTodayCents, 
            budgetCents, 
            budgetSpentCents, 
            budgetLeftCents, 
            budgetProgressPct,
            biggestInvoice, 
            nextBill 
        };
    }, [financeData]);
    
    // digitalData é SEMPRE DigitalDashboardData por causa do contrato seguro do hook.
    const { summary: digitalSummary, topOffers } = digitalData;

    // Calcular total a receber de empréstimos (saldos positivos)
    const totalToReceive = useMemo(() => {
        if (!loans) return 0;
        return loans.reduce((sum: number, loan) => {
            return loan.balanceCents > 0 ? sum + loan.balanceCents : sum;
        }, 0);
    }, [loans]);

    // 4. O JSX abaixo usa os `isLoading` para renderização condicional, mas a chamada dos hooks acima é incondicional.
    return (
        <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="p-2 border rounded-md"/>
                    <Link href="/transacoes" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Lançar transação</Link>
                </div>
            </header>
            
            {(financeErrorMsg || digitalErrorMsg || activityErrorMsg) && (
                <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-md">
                    {financeErrorMsg && <p><strong>Erro (Finanças):</strong> {financeErrorMsg}</p>}
                    {digitalErrorMsg && <p><strong>Erro (Digital):</strong> {digitalErrorMsg}</p>}
                    {activityErrorMsg && <p><strong>Erro (Atividades):</strong> {activityErrorMsg}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Principal (2/3) */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Seção Finanças Pessoais */}
                    <section>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isFinanceLoading ? <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></> : (
                                <>
                                    <Card title="SDM" value={formatBRL(derivedFinanceData.sdmCents)} subtitle="Receitas - Despesas - Contas Fixas" tooltip="Receita do mês - Gastos já realizados - Previsão de contas fixas" />
                                    
                                    <BudgetCard 
                                        month={month}
                                        budgetCents={derivedFinanceData.budgetCents}
                                        budgetSpentCents={derivedFinanceData.budgetSpentCents}
                                        budgetProgressPct={derivedFinanceData.budgetProgressPct}
                                    />
                                    
                                    <Card 
                                        title="Pode Gastar Hoje" 
                                        value={formatBRL(derivedFinanceData.canSpendTodayCents)} 
                                        subtitle={`Restando ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1} dias`} 
                                        tooltip={derivedFinanceData.budgetCents > 0 ? "Calculado com base no orçamento mensal definido" : "Calculado com base no SDM (Saldo Disponível no Mês)"} 
                                    />
                                    
                                    {/* Card de Fatura Atual com Link */}
                                    <div className="bg-white p-6 rounded-lg shadow-md">
                                        {derivedFinanceData.biggestInvoice && derivedFinanceData.biggestInvoice.amount_cents > 0 ? (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Fatura Atual ({derivedFinanceData.biggestInvoice.card_name})</h3>
                                                <p className="text-3xl font-bold mt-2">{formatBRL(derivedFinanceData.biggestInvoice.amount_cents)}</p>
                                                <p className="text-sm text-gray-400 mt-1">Vence em {derivedFinanceData.biggestInvoice.days_to_due} dias</p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Fatura Atual</h3>
                                                <p className="text-3xl font-bold mt-2">{formatBRL(0)}</p>
                                                <p className="text-sm text-gray-400 mt-1">Nenhuma fatura em aberto</p>
                                            </>
                                        )}
                                        <Link href="/faturas" className="text-sm text-indigo-600 hover:underline mt-2 block">
                                            Ver faturas
                                        </Link>
                                    </div>

                                    {/* Card de Próxima Conta com Link */}
                                    <div className="bg-white p-6 rounded-lg shadow-md">
                                        {derivedFinanceData.nextBill ? (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Próxima Conta ({derivedFinanceData.nextBill.name})</h3>
                                                <p className="text-3xl font-bold mt-2">{formatBRL(derivedFinanceData.nextBill.amountCents)}</p>
                                                <p className="text-sm text-gray-400 mt-1">Vence em {Math.ceil((new Date(derivedFinanceData.nextBill.dateISO).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dias</p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Próxima Conta</h3>
                                                <p className="text-3xl font-bold mt-2">N/A</p>
                                                <p className="text-sm text-gray-400 mt-1">Nenhuma conta fixa próxima</p>
                                            </>
                                        )}
                                        <Link href="/fixas" className="text-sm text-indigo-600 hover:underline mt-2 block">
                                            Ver fixas
                                        </Link>
                                    </div>

                                    {/* Card de Empréstimos */}
                                    <div className="bg-white p-6 rounded-lg shadow-md">
                                        {isLoansLoading ? (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Empréstimos</h3>
                                                <div className="h-10 bg-gray-200 rounded animate-pulse mt-2"></div>
                                            </>
                                        ) : totalToReceive > 0 ? (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Empréstimos</h3>
                                                <p className="text-3xl font-bold mt-2 text-green-600">{formatBRL(totalToReceive)}</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {loans?.filter((l) => l.balanceCents > 0).length || 0} {loans?.filter((l: any) => l.balanceCents > 0).length === 1 ? 'pessoa' : 'pessoas'}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-medium text-gray-500">Empréstimos</h3>
                                                <p className="text-3xl font-bold mt-2">{formatBRL(0)}</p>
                                                <p className="text-sm text-gray-400 mt-1">Nada a receber</p>
                                            </>
                                        )}
                                        <Link href="/emprestimos" className="text-sm text-indigo-600 hover:underline mt-2 block">
                                            Ver empréstimos
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                    
                    {/* Seção de Desempenho Digital */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Desempenho Digital</h2>
                            <div className="flex gap-2">
                                <Link href="/digital" className="px-3 py-1.5 text-sm bg-gray-200 rounded-md hover:bg-gray-300">Abrir /digital</Link>
                                <Link href="/digital/registrar" className="px-3 py-1.5 text-sm bg-indigo-100 rounded-md hover:bg-indigo-200">Registrar</Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            {isDigitalLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : (
                                <>
                                    <Card title="Gasto" value={formatBRL(digitalSummary.spendCents)} />
                                    <Card title="Receita" value={formatBRL(digitalSummary.revenueCents)} />
                                    <Card title="ROI" value={digitalSummary.roiPct === null ? '—' : `${digitalSummary.roiPct.toFixed(1)}%`} tooltip="(Receita - Gasto) / Gasto" />
                                    <Card title="CAC" value={digitalSummary.cacCents === null ? '—' : formatBRL(digitalSummary.cacCents)} tooltip="Gasto Total / Nº de Vendas" />
                                    <Card title="Ticket Médio" value={digitalSummary.ticketCents === null ? '—' : formatBRL(digitalSummary.ticketCents)} tooltip="Receita Total / Nº de Vendas" />
                                    <Card title="Tempo (h)" value={`${digitalSummary.hours.toFixed(1)}h`} />
                                </>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-4">Top 5 Ofertas por Lucro</h3>
                            {isDigitalLoading ? (<div className="w-full h-40 bg-gray-200 rounded animate-pulse"></div>) : (
                                topOffers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Oferta</th><th className="px-4 py-2 text-right">Lucro</th><th className="px-4 py-2 text-right">Receita</th><th className="px-4 py-2 text-right">Gasto</th></tr></thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {topOffers.map((offer: OfferRankingRow) => (
                                                    <tr key={offer.offerId}>
                                                        <td className="px-4 py-3"><Link href={`/digital/oferta/${offer.offerId}`} className="text-indigo-600 hover:underline">{offer.offerName}</Link></td>
                                                        <td className="px-4 py-3 text-right font-semibold">{formatBRL(offer.profitCents)}</td>
                                                        <td className="px-4 py-3 text-right">{formatBRL(offer.revenueCents)}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-500">{formatBRL(offer.spendCents)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (<p className="text-center text-gray-500 py-4">Nenhum dado de oferta encontrado.</p>)
                            )}
                        </div>
                    </section>
                </div>

                {/* Coluna Lateral (1/3) */}
                <aside className="lg:col-span-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Atividades Recentes</h2>
                    {isActivityLoading ? (
                        <ActivityListSkeleton />
                    ) : (
                        <RecentActivity activities={activities || []} />
                    )}
                </aside>
        </div>
      </main>
  );
}
