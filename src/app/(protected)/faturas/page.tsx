'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCardCycles, payCardInvoice, type CardWithCycles } from '@/services/invoices';
import { formatBRL, parseBRL } from '@/lib/money';
import CurrencyInputBRL from '@/components/form/CurrencyInputBRL';

// Schema para o formulário de pagamento
const paymentSchema = z.object({
  fromAccountId: z.string().uuid('Selecione a conta de origem.'),
  amountCents: z.number().positive('O valor deve ser maior que zero.'),
  occurredAt: z.string().min(1, 'A data do pagamento é obrigatória.'),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

type Account = { id: string; name: string };

// --- Componente do Modal de Pagamento ---
function PaymentModal({
    card,
    accounts,
    onClose,
    onSuccess,
}: {
    card: CardWithCycles;
    accounts: Account[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;
    const [isPending, startTransition] = useTransition();

    const { register, handleSubmit, formState: { errors }, control } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amountCents: card.closed ? card.closed.amountCents : 0,
            occurredAt: new Date().toISOString().slice(0, 10),
        },
    });

    const onSubmit = async (formData: PaymentFormData) => {
        if (!userId) return;
        startTransition(async () => {
            try {
                await payCardInvoice(supabase, userId, {
                    cardId: card.cardId,
                    fromAccountId: formData.fromAccountId,
                    amountCents: formData.amountCents,
                    occurredAt: formData.occurredAt,
                });
                onSuccess();
            } catch (error: any) {
                alert(`Erro ao pagar fatura: ${error.message}`);
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Pagar Fatura - {card.name}</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Valor da Fatura Fechada</label>
                        <p className="font-semibold text-lg">{formatBRL(card.closed?.amountCents ?? 0)}</p>
                    </div>
                    <div>
                        <label htmlFor="fromAccountId" className="block text-sm font-medium">Pagar com a conta</label>
                        <select {...register('fromAccountId')} className="mt-1 block w-full p-2 border rounded-md">
                            <option value="">Selecione...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        {errors.fromAccountId && <p className="text-red-500 text-sm mt-1">{errors.fromAccountId.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Valor a Pagar</label>
                        <Controller
                            name="amountCents"
                            control={control}
                            render={({ field }) => (
                                <CurrencyInputBRL
                                    value={typeof field.value === "number" ? field.value : undefined}
                                    onValueChange={(cents) => field.onChange(cents)}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                />
                            )}
                        />
                        {errors.amountCents && <p className="text-red-500 text-sm mt-1">{errors.amountCents.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Data do Pagamento</label>
                        <input type="date" {...register('occurredAt')} className="mt-1 block w-full p-2 border rounded-md" />
                        {errors.occurredAt && <p className="text-red-500 text-sm mt-1">{errors.occurredAt.message}</p>}
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md">Cancelar</button>
                        <button type="submit" disabled={isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-gray-400">
                            {isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// --- Componente Principal da Página ---
export default function InvoicesPage() {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user?.id;

    const [cardsWithCycles, setCardsWithCycles] = useState<CardWithCycles[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const [selectedCard, setSelectedCard] = useState<CardWithCycles | null>(null);

    const loadData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);
        try {
            const [cyclesData, accountsData] = await Promise.all([
                getCardCycles(supabase, userId),
                supabase.from('accounts').select('id, name').eq('user_id', userId),
            ]);
            setCardsWithCycles(cyclesData);
            setAccounts(accountsData.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePaymentSuccess = () => {
        setSelectedCard(null);
        setToast('Pagamento de fatura registrado com sucesso!');
        loadData(); // Recarrega os dados
        setTimeout(() => setToast(null), 5000);
    };

    if (isLoading) {
        return <main className="p-8"><p>Carregando faturas...</p></main>;
    }

    if (error) {
        return <main className="p-8"><p className="text-red-500">Erro: {error}</p></main>;
    }

    return (
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Faturas de Cartão</h1>

            {toast && <div className="p-4 mb-4 bg-green-100 text-green-800 rounded-md">{toast}</div>}

            {cardsWithCycles.length === 0 ? (
                <p>Você ainda não cadastrou nenhum cartão de crédito.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cardsWithCycles.map(card => (
                        <div key={card.cardId} className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-4">{card.name}</h2>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Fatura Atual</p>
                                        <p className="text-2xl font-semibold">{formatBRL(card.current.amountCents)}</p>
                                        <p className="text-xs text-gray-400">
                                            {card.current.daysToDue && card.current.daysToDue > 0 ? `Vence em ${card.current.daysToDue} dias` : card.current.daysToDue === 0 ? 'Vence hoje' : `Vencida há ${Math.abs(card.current.daysToDue || 0)} dias`}
                                            {' ('}
                                            {new Date(card.current.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            {')'}
                                        </p>
                                    </div>
                                    {card.closed && card.closed.amountCents > 0 && (
                                        <div>
                                            <p className="text-sm text-gray-500">Fatura Fechada</p>
                                            <p className="text-lg font-semibold text-red-600">{formatBRL(card.closed.amountCents)}</p>
                                            <p className="text-xs text-gray-400">
                                                Venceu em {new Date(card.closed.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6">
                                {card.closed && card.closed.amountCents > 0 ? (
                                    <button onClick={() => setSelectedCard(card)} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
                                        Pagar Fatura
                                    </button>
                                ) : (
                                    <p className="text-center text-sm text-gray-400 py-2">Nenhuma fatura fechada a pagar.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedCard && (
                <PaymentModal
                    card={selectedCard}
                    accounts={accounts}
                    onClose={() => setSelectedCard(null)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </main>
    );
}
