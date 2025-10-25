// /src/app/digital/registrar/page.tsx
'use client';

// React 19 removeu ReactDOM.findDOMNode; máscaras antigas quebram.
// Substituímos por input controlado/CurrencyInput sem dependências externas.

// Propósito: Fornecer uma interface para registrar manualmente gastos e vendas.
// Esta versão usa um input controlado para a formatação de moeda para evitar
// o erro `findDOMNode` causado por bibliotecas de máscara mais antigas no React 19.

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import * as digitalService from '@/services/digital';
import { parseBRL, formatBRL } from '@/lib/money';
import CurrencyInput from '@/components/ui/CurrencyInput';

// Regex agora valida a string que o usuário digita (apenas números, ponto e vírgula)
const moneyRegex = /^[0-9.,]+$/;
const LAST_OFFER_KEY = 'lastUsedOfferId';

const spendSchema = z.object({
  offerId: z.string().uuid('Selecione uma oferta'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD'),
  amountBRL: z.string().regex(moneyRegex, 'Valor inválido').min(1, 'Valor obrigatório'),
  note: z.string().optional(),
});

const saleSchema = z.object({
  offerId: z.string().uuid('Selecione uma oferta'),
  datetime: z.string().min(1, 'Data/hora obrigatória'),
  amountBRL: z.string().regex(moneyRegex, 'Valor inválido').min(1, 'Valor obrigatório'),
});

type SpendFormData = z.infer<typeof spendSchema>;
type SaleFormData = z.infer<typeof saleSchema>;
type Offer = { id: string; name: string };

const FormFeedback = ({ type, message }: { type: 'success' | 'error', message: string }) => (
    <div className={`mt-4 p-3 rounded text-sm ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {message}
    </div>
);

const ValuePresets = ({ onSelect }: { onSelect: (value: string) => void }) => (
    <div className="flex gap-2 mt-2">
        {[50, 100, 200].map(val => (
            <button
                key={val}
                type="button"
                onClick={() => onSelect(`${val},00`)}
                className="py-1 px-3 text-xs bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
            >
                R$ {val}
            </button>
        ))}
    </div>
);


export default function RegisterPage() {
    const supabase = useSupabaseClient();
    const session = useSession();
    const userId = session?.user.id;

    const [activeTab, setActiveTab] = useState<'spend' | 'sale'>('spend');
    const [offers, setOffers] = useState<Offer[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const { register: registerSpend, handleSubmit: handleSubmitSpend, formState: { errors: errorsSpend }, reset: resetSpend, setValue: setSpendValue, control: controlSpend, watch: watchSpend } = useForm<SpendFormData>({ 
        resolver: zodResolver(spendSchema),
        defaultValues: { offerId: '' }
    });
    const { register: registerSale, handleSubmit: handleSubmitSale, formState: { errors: errorsSale }, reset: resetSale, setValue: setSaleValue, control: controlSale, watch: watchSale } = useForm<SaleFormData>({ 
        resolver: zodResolver(saleSchema),
        defaultValues: { offerId: '' }
    });

    const spendAmount = watchSpend('amountBRL');
    const saleAmount = watchSale('amountBRL');

    // Efeito para carregar as ofertas e pré-selecionar a última usada.
    useEffect(() => {
        const fetchOffersAndSetLastUsed = async () => {
          if (!userId) return;
          const { data, error } = await supabase.from('offers').select('id, name');
          if (error) {
            console.error("Erro ao buscar ofertas:", error);
          } else {
            setOffers(data || []);
            // COMENTÁRIO: Acessamos o localStorage para buscar o ID da última oferta
            // usada. Isso melhora a experiência do usuário ao evitar a re-seleção.
            const lastUsedOfferId = localStorage.getItem(LAST_OFFER_KEY);
            if (lastUsedOfferId && data?.some(o => o.id === lastUsedOfferId)) {
                setSpendValue('offerId', lastUsedOfferId);
                setSaleValue('offerId', lastUsedOfferId);
            }
          }
        };
        fetchOffersAndSetLastUsed();
    }, [userId, supabase, setSpendValue, setSaleValue]);

    const onSpendSubmit = async (formData: SpendFormData) => {
        if (!userId) { alert("Sessão expirada. Faça login novamente."); return; }
        setFeedback(null);
        try {
            // COMENTÁRIO: O valor do input (ex: "1.234,56") é convertido
            // para um número inteiro de centavos usando nossa lib.
            // Isso evita erros de ponto flutuante, uma prática crucial em sistemas financeiros.
            const amountCents = parseBRL(formData.amountBRL);
            
            // A RLS no Supabase exige que o `userId` seja inserido.
            // A função de serviço garante isso, mas a chamada aqui precisa fornecer o `userId`.
            await digitalService.createSpendManual(supabase, userId, {
                offerId: formData.offerId,
                dateYMD: formData.date,
                amountCents,
                note: formData.note
            });
            setFeedback({ type: 'success', message: 'Gasto registrado com sucesso!' });
            
            // Salva a oferta usada no localStorage para a próxima visita.
            localStorage.setItem(LAST_OFFER_KEY, formData.offerId);
            resetSpend({ ...formData, amountBRL: '', note: '' });

        } catch (error: any) {
            setFeedback({ type: 'error', message: `Erro: ${error.message}` });
        }
    };
    
    const onSaleSubmit = async (formData: SaleFormData) => {
        if (!userId) { alert("Sessão expirada. Faça login novamente."); return; }
        setFeedback(null);
        try {
            const amountCents = parseBRL(formData.amountBRL);
            const dateISO = digitalService.toISOFromLocal(formData.datetime);
            
            await digitalService.createSaleManual(supabase, userId, {
                offerId: formData.offerId,
                dateISO,
                amountCents,
                status: 'approved'
            });
            setFeedback({ type: 'success', message: 'Venda registrada com sucesso!' });

            localStorage.setItem(LAST_OFFER_KEY, formData.offerId);
            resetSale({ ...formData, amountBRL: '' });

        } catch (error: any) {
            setFeedback({ type: 'error', message: `Erro: ${error.message}` });
        }
    };

    // Função para formatar o valor do input de moeda ao perder o foco.
    const handleCurrencyBlur = (e: React.FocusEvent<HTMLInputElement>, field: 'spend' | 'sale') => {
        const value = e.target.value;
        const cents = parseBRL(value);
        const formattedValue = formatBRL(cents);
        if (field === 'spend') {
            setSpendValue('amountBRL', formattedValue);
        } else {
            setSaleValue('amountBRL', formattedValue);
        }
    }

    if (!session) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <p>Você precisa estar logado para acessar esta página. <Link href="/login" className="text-blue-500">Faça o login.</Link></p>
        </main>
    );
  }

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Registrar Lançamento</h1>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button onClick={() => setActiveTab('spend')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'spend' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Gasto
          </button>
          <button onClick={() => setActiveTab('sale')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sale' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Venda
          </button>
        </nav>
      </div>

      <div className="w-full max-w-lg">
        {activeTab === 'spend' && (
          <form onSubmit={handleSubmitSpend(onSpendSubmit)} className="space-y-4">
            {/* Campos do formulário de Gasto */}
            <div>
                <label htmlFor="spend_offer_id" className="block text-sm font-medium text-gray-700">Oferta</label>
                <select id="spend_offer_id" {...registerSpend('offerId')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">Selecione uma oferta</option>
                    {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {errorsSpend.offerId && <p className="text-red-500 text-xs mt-1">{errorsSpend.offerId.message}</p>}
            </div>
            <div>
                <label htmlFor="spend_date" className="block text-sm font-medium text-gray-700">Data</label>
                <input type="date" id="spend_date" {...registerSpend('date')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                {errorsSpend.date && <p className="text-red-500 text-xs mt-1">{errorsSpend.date.message}</p>}
            </div>
            <div>
                <label htmlFor="spend_amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <CurrencyInput
                    id="spend_amount"
                    value={spendAmount}
                    onChange={(value) => setSpendValue('amountBRL', value, { shouldValidate: true })}
                    placeholder="0,00"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
                <ValuePresets onSelect={(val) => setSpendValue('amountBRL', val, { shouldValidate: true })} />
                {errorsSpend.amountBRL && <p className="text-red-500 text-xs mt-1">{errorsSpend.amountBRL.message}</p>}
            </div>
            <div>
                <label htmlFor="spend_note" className="block text-sm font-medium text-gray-700">Observação</label>
                <input type="text" id="spend_note" {...registerSpend('note')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Registrar Gasto</button>
          </form>
        )}

        {activeTab === 'sale' && (
            <form onSubmit={handleSubmitSale(onSaleSubmit)} className="space-y-4">
              {/* Campos do formulário de Venda */}
              <div>
                  <label htmlFor="sale_offer_id" className="block text-sm font-medium text-gray-700">Oferta</label>
                  <select id="sale_offer_id" {...registerSale('offerId')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Selecione uma oferta</option>
                      {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  {errorsSale.offerId && <p className="text-red-500 text-xs mt-1">{errorsSale.offerId.message}</p>}
              </div>
              <div>
                  <label htmlFor="sale_date" className="block text-sm font-medium text-gray-700">Data e Hora</label>
                  <input type="datetime-local" id="sale_date" {...registerSale('datetime')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                  {errorsSale.datetime && <p className="text-red-500 text-xs mt-1">{errorsSale.datetime.message}</p>}
              </div>
              <div>
                  <label htmlFor="sale_amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <CurrencyInput
                      id="sale_amount"
                      value={saleAmount}
                      onChange={(value) => setSaleValue('amountBRL', value, { shouldValidate: true })}
                      placeholder="0,00"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  />
                  <ValuePresets onSelect={(val) => setSaleValue('amountBRL', val, { shouldValidate: true })} />
                  {errorsSale.amountBRL && <p className="text-red-500 text-xs mt-1">{errorsSale.amountBRL.message}</p>}
              </div>
              <button type="submit" className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Registrar Venda</button>
            </form>
        )}

        {feedback && <FormFeedback type={feedback.type} message={feedback.message} />}
      </div>
    </main>
  );
}
