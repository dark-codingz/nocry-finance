'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listFixedBills, updateFixedBill, runFixedForMonth, type FixedBill } from '@/services/fixedBills';
import { createFixedBill } from '@/services/finance';
import { formatBRL, parseBRL } from '@/lib/money';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';

// Schema de validação para criação/edição de fixa
const fixedBillSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  amountCents: z.number().positive('Valor deve ser maior que zero'),
  dayOfMonth: z.coerce.number().min(1, 'Dia mínimo: 1').max(31, 'Dia máximo: 31'),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
}).refine(data => !!data.accountId !== !!data.cardId, {
  message: 'Selecione uma conta OU um cartão (apenas um).',
  path: ['accountId'],
});

type FixedBillFormData = z.infer<typeof fixedBillSchema>;

type Account = { id: string; name: string };
type Card = { id: string; name: string };

export default function FixedBillsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const [bills, setBills] = useState<FixedBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<FixedBillFormData>({
    resolver: zodResolver(fixedBillSchema),
  });

  const loadData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [billsData, accountsData, cardsData] = await Promise.all([
        listFixedBills(supabase, userId),
        supabase.from('accounts').select('id, name').eq('user_id', userId),
        supabase.from('cards').select('id, name').eq('user_id', userId),
      ]);
      setBills(billsData);
      setAccounts(accountsData.data || []);
      setCards(cardsData.data || []);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const onSubmit = async (formData: FixedBillFormData) => {
    if (!userId) return;
    startTransition(async () => {
      try {
        if (editingBill) {
          // Editar fixa existente
          await updateFixedBill(supabase, userId, {
            id: editingBill.id,
            name: formData.name,
            amount_cents: formData.amountCents,
            day_of_month: formData.dayOfMonth,
            account_id: formData.accountId || null,
            card_id: formData.cardId || null,
          });
          setToast({ type: 'success', message: 'Fixa atualizada com sucesso!' });
        } else {
          // Criar nova fixa
          await createFixedBill(supabase, userId, {
            name: formData.name,
            amountCents: formData.amountCents,
            dayOfMonth: formData.dayOfMonth,
            accountId: formData.accountId,
            cardId: formData.cardId,
            isActive: true,
          });
          setToast({ type: 'success', message: 'Fixa criada com sucesso!' });
        }
        reset();
        setEditingBill(null);
        loadData();
      } catch (err: any) {
        setToast({ type: 'error', message: err.message });
      }
    });
  };

  const handleEdit = (bill: FixedBill) => {
    setEditingBill(bill);
    reset({
      name: bill.name,
      amountCents: bill.amount_cents,
      dayOfMonth: bill.day_of_month,
      accountId: bill.account_id || undefined,
      cardId: bill.card_id || undefined,
    });
  };

  const handleToggleActive = async (bill: FixedBill) => {
    if (!userId) return;
    startTransition(async () => {
      try {
        await updateFixedBill(supabase, userId, {
          id: bill.id,
          is_active: !bill.is_active,
        });
        setToast({ type: 'success', message: `Fixa ${bill.is_active ? 'desativada' : 'ativada'}!` });
        loadData();
      } catch (err: any) {
        setToast({ type: 'error', message: err.message });
      }
    });
  };

  const handleRunMonth = async () => {
    if (!userId) return;
    startTransition(async () => {
      try {
        const count = await runFixedForMonth(supabase, userId, selectedMonth);
        setToast({ type: 'success', message: `${count} fixa(s) lançada(s) para ${selectedMonth}!` });
        loadData();
      } catch (err: any) {
        setToast({ type: 'error', message: err.message });
      }
    });
  };

  if (isLoading) {
    return <main className="p-8"><p>Carregando...</p></main>;
  }

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Despesas Fixas</h1>

      {toast && (
        <div className={`p-4 mb-4 rounded-md text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Seção: Lançar Fixas do Mês */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Lançar Fixas do Mês</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Mês</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleRunMonth}
            disabled={isPending}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isPending ? 'Lançando...' : 'Lançar Fixas'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Cria automaticamente as transações das fixas ativas para o mês selecionado, evitando duplicatas.
        </p>
      </div>

      {/* Seção: Formulário de Criação/Edição */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">{editingBill ? 'Editar Fixa' : 'Nova Fixa'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input {...register('name')} className="w-full p-2 border rounded-md" placeholder="Ex: Aluguel" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor (R$)</label>
            <Controller
              name="amountCents"
              control={control}
              render={({ field }) => (
                <CurrencyInputBRL
                  value={typeof field.value === "number" ? field.value : undefined}
                  onValueChange={(cents) => field.onChange(cents)}
                  className="w-full p-2 border rounded-md"
                />
              )}
            />
            {errors.amountCents && <p className="text-red-500 text-xs mt-1">{errors.amountCents.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dia do Vencimento (1-31)</label>
            <input type="number" {...register('dayOfMonth')} className="w-full p-2 border rounded-md" min={1} max={31} />
            {errors.dayOfMonth && <p className="text-red-500 text-xs mt-1">{errors.dayOfMonth.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conta (opcional)</label>
            <select {...register('accountId')} className="w-full p-2 border rounded-md">
              <option value="">Nenhuma</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cartão (opcional)</label>
            <select {...register('cardId')} className="w-full p-2 border rounded-md">
              <option value="">Nenhum</option>
              {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
            {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
          </div>
          <div className="flex gap-2 items-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isPending ? 'Salvando...' : editingBill ? 'Atualizar' : 'Criar'}
            </button>
            {editingBill && (
              <button
                type="button"
                onClick={() => { reset(); setEditingBill(null); }}
                className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Seção: Listagem de Fixas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Suas Fixas</h2>
        {bills.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nenhuma fixa cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Lançamento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td className="px-4 py-3 text-sm font-medium">{bill.name}</td>
                    <td className="px-4 py-3 text-sm">{formatBRL(bill.amount_cents)}</td>
                    <td className="px-4 py-3 text-sm">Dia {bill.day_of_month}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {bill.account_id ? accounts.find(a => a.id === bill.account_id)?.name || 'Conta' : 
                       bill.card_id ? cards.find(c => c.id === bill.card_id)?.name || 'Cartão' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${bill.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {bill.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bill.last_run_month || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(bill)} className="text-indigo-600 hover:underline">Editar</button>
                        <button onClick={() => handleToggleActive(bill)} className="text-blue-600 hover:underline">
                          {bill.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

