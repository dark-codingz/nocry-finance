// /src/app/transacoes/page.tsx
// React 19 removeu ReactDOM.findDOMNode; máscaras antigas quebram.
// Substituímos por input controlado/CurrencyInput sem dependências externas.
// App Router (next/navigation): hooks só funcionam em Client Components e precisam de "use client".
'use client';

// Propósito: Página para gerenciamento de transações financeiras, permitindo
// o registro de despesas, receitas e transferências, e a visualização
// do extrato mensal.

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useMonthParam } from '@/hooks/useMonthParam';
import { formatBRL, parseBRL, toCents } from '@/lib/money';
import { createExpense, createIncome, createTransfer, listMonthTransactions } from '@/services/finance';
import { listCategories } from '@/services/categories';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';
import { useDebouncedValue } from '@/lib/debounce';
import { useRecentFinance } from '@/hooks/useRecentFinance';
import RecentFinance from '@/components/RecentFinance';
import type { Account, Card, Category, Transaction, TxFilters } from '@/types/tx';

// ============================================================================
// Utils
// ============================================================================
function getMonthRange(monthStr?: string | null) {
  const now = new Date();
  const dateStr = monthStr ? `${monthStr}-15` : now.toISOString(); // Use dia 15 para evitar bugs de fuso
  const targetDate = new Date(dateStr);
  
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  
  const lastDayNum = new Date(y, m, 0).getDate();
  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay  = `${y}-${String(m).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
  
  return { firstDay, lastDay, y, m };
}

// ============================================================================
// Schemas de Validação (Zod)
// ============================================================================
// NOTE: Com CurrencyInputBRL, amountCents já vem como number
// Mantemos suporte legado a string para casos especiais
const moneySchema = z.union([
  z.number().int().positive('Valor deve ser maior que zero'),
  z.string().transform((val, ctx) => {
    const cents = toCents(val);
    if (isNaN(cents) || cents <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Valor deve ser maior que zero.',
      });
      return z.NEVER;
    }
    return cents;
  })
]);

const emptyStringToUndefined = z.string().trim().transform(v => (v === "" ? undefined : v)).optional();

const expenseSchema = z.object({
    amountCents: moneySchema,
    occurredAt: z.string().min(1, 'Data obrigatória'),
    description: z.string().optional(),
    categoryId: emptyStringToUndefined,
    accountId: emptyStringToUndefined,
    cardId: emptyStringToUndefined,
}).refine(data => !!data.accountId !== !!data.cardId, {
    message: 'Selecione uma conta OU um cartão (apenas um).',
    path: ['accountId'],
});

const incomeSchema = z.object({
    amountCents: moneySchema,
    occurredAt: z.string().min(1, 'Data obrigatória'),
    description: z.string().optional(),
    categoryId: emptyStringToUndefined,
    accountId: z.string().uuid('Selecione uma conta de destino.'),
});

const transferSchema = z.object({
    amountCents: moneySchema,
    occurredAt: z.string().min(1, 'Data obrigatória'),
    description: z.string().optional(),
    fromAccountId: z.string().uuid('Selecione a conta de origem.'),
    toAccountId: z.string().uuid('Selecione a conta de destino.'),
}).refine(data => data.fromAccountId !== data.toAccountId, {
    message: 'As contas de origem e destino não podem ser iguais.',
    path: ['toAccountId'],
});

// Tipos com amountCents como number após transformação
type ExpenseFormData = z.output<typeof expenseSchema>;
type IncomeFormData = z.output<typeof incomeSchema>;
type TransferFormData = z.output<typeof transferSchema>;

// Tipos para o form input (antes da transformação)
type ExpenseFormInput = z.input<typeof expenseSchema>;
type IncomeFormInput = z.input<typeof incomeSchema>;
type TransferFormInput = z.input<typeof transferSchema>;

// ============================================================================
// Tipos de Dados (importados de @/types/tx)
// ============================================================================
// NOTE: Account, Card, Category, Transaction, TxFilters importados do módulo de tipos

// ============================================================================
// Componentes de Formulário (Subcomponentes internos)
// ============================================================================
const ExpenseForm = ({ onSubmit, accounts, cards, categories, isLoading }: { onSubmit: (data: ExpenseFormData) => Promise<void>; accounts: Account[]; cards: Card[]; categories: Category[]; isLoading: boolean }) => {
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm<ExpenseFormInput>({ resolver: zodResolver(expenseSchema) });
    
    const handleFormSubmit = async (data: any) => {
        await onSubmit(data as ExpenseFormData);
        reset({ occurredAt: new Date().toISOString().slice(0, 10), description: '', categoryId: '', accountId: '', cardId: '', amountCents: 0 });
    };
    
    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div>
                <label htmlFor="amountBRL" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <Controller
                    name="amountCents"
                    control={control}
                    render={({ field }) => (
                        <CurrencyInputBRL
                            value={typeof field.value === "number" ? field.value : undefined}
                            onValueChange={(cents) => field.onChange(cents)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    )}
                />
                {errors.amountCents && <p className="mt-1 text-sm text-red-600">{errors.amountCents.message}</p>}
            </div>
            <div>
                <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700">Data (YYYY-MM-DD)</label>
                <input
                    type="date"
                    id="occurredAt"
                    {...register('occurredAt')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.occurredAt && <p className="mt-1 text-sm text-red-600">{errors.occurredAt.message}</p>}
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
                <input
                    type="text"
                    id="description"
                    {...register('description')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
            <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">Categoria (opcional)</label>
                <select
                    id="categoryId"
                    {...register('categoryId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
            </div>
            <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">Conta (opcional)</label>
                <select
                    id="accountId"
                    {...register('accountId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
                {errors.accountId && <p className="mt-1 text-sm text-red-600">{errors.accountId.message}</p>}
            </div>
            <div>
                <label htmlFor="cardId" className="block text-sm font-medium text-gray-700">Cartão (opcional)</label>
                <select
                    id="cardId"
                    {...register('cardId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione um cartão</option>
                    {cards.map(card => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                </select>
                {errors.cardId && <p className="mt-1 text-sm text-red-600">{errors.cardId.message}</p>}
            </div>
            <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                disabled={isLoading}
            >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Despesa'}
            </button>
        </form>
    );
};

const IncomeForm = ({ onSubmit, accounts, categories, isLoading }: { onSubmit: (data: IncomeFormData) => Promise<void>; accounts: Account[]; categories: Category[]; isLoading: boolean }) => {
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm<IncomeFormInput>({ resolver: zodResolver(incomeSchema) });
    
    const handleFormSubmit = async (data: any) => {
        await onSubmit(data as IncomeFormData);
        reset({ occurredAt: new Date().toISOString().slice(0, 10), description: '', categoryId: '', accountId: '', amountCents: 0 });
    };
    
    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div>
                <label htmlFor="amountBRL" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <Controller
                    name="amountCents"
                    control={control}
                    render={({ field }) => (
                        <CurrencyInputBRL
                            value={typeof field.value === "number" ? field.value : undefined}
                            onValueChange={(cents) => field.onChange(cents)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    )}
                />
                {errors.amountCents && <p className="mt-1 text-sm text-red-600">{errors.amountCents.message}</p>}
            </div>
            <div>
                <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700">Data (YYYY-MM-DD)</label>
                <input
                    type="date"
                    id="occurredAt"
                    {...register('occurredAt')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.occurredAt && <p className="mt-1 text-sm text-red-600">{errors.occurredAt.message}</p>}
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
                <input
                    type="text"
                    id="description"
                    {...register('description')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
            <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">Categoria (opcional)</label>
                <select
                    id="categoryId"
                    {...register('categoryId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
            </div>
            <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">Conta de Destino</label>
                <select
                    id="accountId"
                    {...register('accountId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
                {errors.accountId && <p className="mt-1 text-sm text-red-600">{errors.accountId.message}</p>}
            </div>
            <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                disabled={isLoading}
            >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Receita'}
            </button>
        </form>
    );
};

const TransferForm = ({ onSubmit, accounts, isLoading }: { onSubmit: (data: TransferFormData) => Promise<void>; accounts: Account[]; isLoading: boolean }) => {
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm<TransferFormInput>({ resolver: zodResolver(transferSchema) });
    
    const handleFormSubmit = async (data: any) => {
        await onSubmit(data as TransferFormData);
        reset({ occurredAt: new Date().toISOString().slice(0, 10), description: '', fromAccountId: '', toAccountId: '', amountCents: 0 });
    };
    
    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div>
                <label htmlFor="amountBRL" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <Controller
                    name="amountCents"
                    control={control}
                    render={({ field }) => (
                        <CurrencyInputBRL
                            value={typeof field.value === "number" ? field.value : undefined}
                            onValueChange={(cents) => field.onChange(cents)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    )}
                />
                {errors.amountCents && <p className="mt-1 text-sm text-red-600">{errors.amountCents.message}</p>}
            </div>
            <div>
                <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700">Data (YYYY-MM-DD)</label>
                <input
                    type="date"
                    id="occurredAt"
                    {...register('occurredAt')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.occurredAt && <p className="mt-1 text-sm text-red-600">{errors.occurredAt.message}</p>}
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
                <input
                    type="text"
                    id="description"
                    {...register('description')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
            <div>
                <label htmlFor="fromAccountId" className="block text-sm font-medium text-gray-700">Conta de Origem</label>
                <select
                    id="fromAccountId"
                    {...register('fromAccountId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
                {errors.fromAccountId && <p className="mt-1 text-sm text-red-600">{errors.fromAccountId.message}</p>}
            </div>
            <div>
                <label htmlFor="toAccountId" className="block text-sm font-medium text-gray-700">Conta de Destino</label>
                <select
                    id="toAccountId"
                    {...register('toAccountId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
                {errors.toAccountId && <p className="mt-1 text-sm text-red-600">{errors.toAccountId.message}</p>}
            </div>
            <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                disabled={isLoading}
            >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Transferência'}
            </button>
        </form>
    );
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Componente Principal
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
export default function TransactionsPage() {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;
    
    // Hooks de navegação centralizados no useMonthParam
    const { month, setMonth } = useMonthParam();

    const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>('expense');
    
    // Dados para os selects dos formulários
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Estado da lista de transações
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isListLoading, setIsListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Gerenciamento do mês ativo
    // const monthParam = searchParams.get('m'); // Removed as per edit hint
    // const [selectedMonth, setSelectedMonth] = useState(monthParam || new Date().toISOString().slice(0, 7)); // Removed as per edit hint

    // --- ESTADO DOS FILTROS ---
    // NOTE: Tipado como TxFilters para evitar erros "implicitly any"
    const [filters, setFilters] = useState<TxFilters>({
        accountId: '',
        cardId: '',
        categoryId: '',
        q: '',
    });
    // NOTE: debouncedSearchTerm pode ser string | undefined; normalizamos para string
    const debouncedSearchTerm = useDebouncedValue(filters.q, 300) ?? '';

    // --- HOOK PARA ATIVIDADES RECENTES ---
    // O painel lateral usa as mesmas janelas de data e filtros da lista principal,
    // apenas com um limite de 10 itens para agilidade.
    const { firstDay, lastDay } = getMonthRange(month);
    const { data: recentItems, isLoading: loadingRecent, error: recentError } = useRecentFinance({
      firstDay, lastDay,
      accountId: filters.accountId || undefined,
      cardId: filters.cardId || undefined,
      categoryId: filters.categoryId || undefined,
      q: debouncedSearchTerm || undefined,
      limit: 10,
    });

    // Busca os dados iniciais (contas, cartões, categorias)
    useEffect(() => {
        if (!userId) return;
        const fetchData = async () => {
            const [accRes, cardRes, catRes] = await Promise.all([
                supabase.from('accounts').select('id, name'),
                supabase.from('cards').select('id, name'),
                supabase.from('categories').select('id, name, type')
            ]);
            if (accRes.data) setAccounts(accRes.data);
            if (cardRes.data) setCards(cardRes.data);
            if (catRes.data) setCategories(catRes.data);
        };
        fetchData();
    }, [userId, supabase]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // NOTE: Função tipada para evitar "implicitly any" e "string | undefined"
    const reloadMonthList = useCallback(async (currentFilters: TxFilters, searchTerm: string = '') => {
        if (!userId) return;
        setIsListLoading(true);
        try {
            const { firstDay, lastDay } = getMonthRange(month);
            const data = await listMonthTransactions(supabase, userId, { 
                firstDay, 
                lastDay,
                accountId: currentFilters.accountId,
                cardId: currentFilters.cardId,
                categoryId: currentFilters.categoryId,
            });
            
            // Filtro de texto `q` é aplicado no client-side
            const term = searchTerm.trim().toLowerCase();
            if (term) {
                setTransactions(data.filter(t => t.description?.toLowerCase().includes(term)));
            } else {
                setTransactions(data);
            }
        } catch (err: any) {
            setListError(err.message);
        } finally {
            setIsListLoading(false);
        }
    }, [supabase, userId, month]);

    useEffect(() => {
        reloadMonthList(filters, debouncedSearchTerm);
    }, [userId, month, filters.accountId, filters.cardId, filters.categoryId, debouncedSearchTerm, reloadMonthList]);
    
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMonth(e.target.value);
    };

    // Totalizadores calculados no cliente, ignorando transferências
    const totals = useMemo(() => {
        return transactions.reduce((acc, tx) => {
            if (tx.type === 'expense') {
                acc.totalExpense += tx.amount_cents;
            } else if (tx.type === 'income') {
                acc.totalIncome += tx.amount_cents;
            }
            return acc;
        }, { totalExpense: 0, totalIncome: 0 });
    }, [transactions]);
    const netTotal = totals.totalIncome - totals.totalExpense;

    const handleSuccess = async () => {
        // NOTE: userId pode ser undefined; fazemos verificação early return
        if (!userId) return;
        
        // Recarrega as transações após um novo lançamento
        const fetchTransactions = async () => {
            setIsListLoading(true);
            const firstDay = `${month}-01`;
            const lastDay = new Date(new Date(firstDay).getFullYear(), new Date(firstDay).getMonth() + 1, 0).toISOString().slice(0, 10);
            
            try {
                const data = await listMonthTransactions(supabase, userId, { firstDay, lastDay });
                setTransactions(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsListLoading(false);
            }
        };
        fetchTransactions();
        // TODO: Mostrar toast de sucesso
    };

    const handleExpenseSubmit = async (formData: ExpenseFormData) => {
        if (!userId) return setToast({ type: 'error', message: 'Sessão inválida. Faça login novamente.'});
        setIsSubmitting(true);
        setToast(null);
        console.log('[submit] expense', formData);
        try {
            const res = await createExpense(supabase, userId, formData);
            console.log('[created] expense', res);
            setToast({ type: 'success', message: 'Despesa cadastrada!' });
            await reloadMonthList(filters, debouncedSearchTerm); // Recarrega a lista
        } catch (err: any) {
            console.error("Erro ao cadastrar despesa:", err);
            setToast({ type: 'error', message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleIncomeSubmit = async (formData: IncomeFormData) => {
        if (!userId) return;
        setIsSubmitting(true);
        setToast(null);
        console.log('[submit] income', formData);
        try {
            const res = await createIncome(supabase, userId, formData);
            console.log('[created] income', res);
            setToast({ type: 'success', message: 'Receita cadastrada!' });
            await reloadMonthList(filters, debouncedSearchTerm); // Recarrega a lista
        } catch (err: any) {
            console.error("Erro ao cadastrar receita:", err);
            setToast({ type: 'error', message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransferSubmit = async (formData: TransferFormData) => {
        if (!userId) return;
        setIsSubmitting(true);
        setToast(null);
        console.log('[submit] transfer', formData);
        try {
            const res = await createTransfer(supabase, userId, formData);
            console.log('[created] transfer', res);
            setToast({ type: 'success', message: 'Transferência cadastrada!' });
            await reloadMonthList(filters, debouncedSearchTerm); // Recarrega a lista
        } catch (err: any) {
            console.error("Erro ao cadastrar transferência:", err);
            setToast({ type: 'error', message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- HANDLERS E LÓGICA DE UI ---
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    // --- LÓGICA DE EXPORTAÇÃO CSV ---
    const exportToCSV = () => {
        const headers = ['Data', 'Tipo', 'Fonte/Destino', 'Categoria', 'Descrição', 'Valor (Centavos)'];
        const rows = transactions.map(t => {
            // NOTE: accounts/cards/categories são arrays do Supabase; pegamos [0]?.name
            const accountName = t.accounts?.[0]?.name || '';
            const cardName = t.cards?.[0]?.name || '';
            const categoryName = t.categories?.[0]?.name || '';
            
            return [
                t.occurred_at,
                t.type,
                accountName || cardName || '',
                categoryName || '',
                t.description || '',
                `${t.type === 'expense' ? '-' : ''}${t.amount_cents}`
            ].join(',');
        });
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `nocry-transacoes-${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    console.log('[render] rows', transactions.length, transactions.slice(0,3));

    return (
        <main className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Transações</h1>
            
            {/* Componente de Toast */}
            {toast && (
                <div className={`p-4 mb-4 rounded-md text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.message}
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex border-b mb-4">
                    {['expense', 'income', 'transfer'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 -mb-px border-b-2 ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Renderização condicional do formulário */}
                {activeTab === 'expense' && <ExpenseForm onSubmit={handleExpenseSubmit} accounts={accounts} cards={cards} categories={categories.filter(c => c.type === 'expense')} isLoading={isSubmitting} />}
                {activeTab === 'income' && <IncomeForm onSubmit={handleIncomeSubmit} accounts={accounts} categories={categories.filter(c => c.type === 'income')} isLoading={isSubmitting} />}
                {activeTab === 'transfer' && <TransferForm onSubmit={handleTransferSubmit} accounts={accounts} isLoading={isSubmitting} />}
            </div>

            {/* --- SEÇÃO DE FILTROS --- */}
            <div className="my-8 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <input type="month" value={month} onChange={handleMonthChange} className="p-2 border rounded-md"/>
                    <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="p-2 border rounded-md">
                        <option value="">Todas as Contas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select name="cardId" value={filters.cardId} onChange={handleFilterChange} className="p-2 border rounded-md">
                        <option value="">Todos os Cartões</option>
                        {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="p-2 border rounded-md">
                        <option value="">Todas as Categorias</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input name="q" value={filters.q} onChange={handleFilterChange} placeholder="Buscar por descrição..." className="p-2 border rounded-md"/>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                {/* Coluna Principal (Formulários e Extrato) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Seção do Extrato Mensal */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Extrato do Mês</h2>
                            <button onClick={exportToCSV} className="text-sm bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700">
                                Exportar CSV
                            </button>
                        </div>

                        {/* Totalizadores */}
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="p-2 bg-red-50 rounded">
                                <div className="text-sm text-red-700">Despesas</div>
                                <div className="font-bold text-red-800">{formatBRL(totals.totalExpense)}</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded">
                                <div className="text-sm text-green-700">Receitas</div>
                                <div className="font-bold text-green-800">{formatBRL(totals.totalIncome)}</div>
                            </div>
                            <div className={`p-2 rounded ${netTotal >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                <div className={`text-sm ${netTotal >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo</div>
                                <div className={`font-bold ${netTotal >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatBRL(netTotal)}</div>
                            </div>
                        </div>

                        {listError && <div className="p-4 mb-4 text-center text-red-700 bg-red-100 rounded-md">Erro: {listError}</div>}
                        
                        {isListLoading ? (
                            <div className="text-center py-4">
                                <p className="text-gray-500">Carregando extrato...</p>
                                {/* Skeleton a ser adicionado no futuro */}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {transactions.length === 0 
                                    ? (
                                        <li className="text-center text-gray-500 py-8">
                                            <p className="font-semibold">Nenhuma transação neste mês.</p>
                                            <p className="text-sm">Cadastre sua primeira despesa, receita ou transferência no formulário acima.</p>
                                        </li>
                                    )
                                    : transactions.map(tx => (
                                        <li key={tx.id} className="py-3 grid grid-cols-4 gap-4 items-center">
                                            <div className="col-span-2">
                                                <p className="font-medium">{tx.description || 'Sem descrição'}</p>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(tx.occurred_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    {' - '}
                                                    {/* NOTE: categories é array do Supabase; pegamos [0]?.name */}
                                                    {tx.categories?.[0]?.name || 'Sem Categoria'}
                                                </p>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {/* NOTE: accounts/cards são arrays do Supabase; pegamos [0]?.name */}
                                                {tx.type === 'transfer' ? 'Transferência' : (tx.accounts?.[0]?.name || tx.cards?.[0]?.name)}
                                            </div>
                                            <div className={`font-semibold text-right ${
                                                tx.type === 'income' ? 'text-green-600' : 
                                                tx.type === 'expense' ? 'text-gray-800' : 'text-gray-500'
                                            }`}>
                                                {tx.type === 'expense' && '- '}
                                                {tx.type === 'income' && '+ '}
                                                {formatBRL(tx.amount_cents)}
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Coluna Lateral (Atividades Recentes) */}
                <aside className="lg:col-span-2">
                    <section className="sticky top-8">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Atividades Recentes</h3>
                        <RecentFinance items={recentItems} loading={loadingRecent} error={recentError} />
                    </section>
                </aside>
            </div>
        </main>
    );
}
