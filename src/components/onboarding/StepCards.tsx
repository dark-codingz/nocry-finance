// /src/components/onboarding/StepCards.tsx
'use client';

// Propósito: Componente para o segundo passo (opcional) do onboarding,
// onde o usuário cadastra seus cartões de crédito.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema de validação com Zod
// - `closingDay` e `dueDay`: Números entre 1-31
const cardSchema = z.object({
  cardName: z.string().min(2, 'Nome muito curto').optional(),
  limitBRL: z.string().regex(/^[0-9.\s]*,?[0-9]{0,2}$/, 'Valor inválido'),
  closingDay: z.number().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  dueDay: z.number().min(1, 'Dia inválido').max(31, 'Dia inválido'),
});

type CardFormData = z.infer<typeof cardSchema>;

interface StepCardsProps {
    onNext: (data: any) => void;
    onBack: () => void;
}

const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
    <div className="relative inline-block group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        {text}
      </div>
    </div>
  );

export default function StepCards({ onNext, onBack }: StepCardsProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    mode: 'onChange',
  });

  const cardName = watch('cardName');
  const showFields = cardName && cardName.length > 0;

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">2. Adicione seus Cartões (Opcional)</h2>
      <p className="text-gray-600">Cadastre seus cartões de crédito para um controle completo.</p>

      {/* Campos do formulário */}
      <div>
        <label htmlFor="cardName" className="block text-sm font-medium text-gray-700">
            Nome do Cartão (opcional)
        </label>
        <input
            type="text"
            id="cardName"
            {...register('cardName')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Ex: Nubank, Inter"
        />
      </div>
      <div>
        <label htmlFor="card_limit" className="block text-sm font-medium text-gray-700">Limite (R$)</label>
        <input id="card_limit" type="text" {...register('limitBRL')} placeholder="5.000,00" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        {errors.limitBRL && <p className="text-red-500 text-xs mt-1">{errors.limitBRL.message}</p>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="card_closing" className="block text-sm font-medium text-gray-700">
            Dia do Fechamento{' '}
            <Tooltip text="O dia do fechamento é a 'data de corte'. Compras feitas a partir deste dia entram apenas na fatura do mês seguinte.">
                <span className="text-blue-500 cursor-help">(?)</span>
            </Tooltip>
          </label>
          <input id="card_closing" type="number" {...register('closingDay', { valueAsNumber: true })} placeholder="Ex: 25" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          {errors.closingDay && <p className="text-red-500 text-xs mt-1">{errors.closingDay.message}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="card_due" className="block text-sm font-medium text-gray-700">Dia do Vencimento</label>
          <input id="card_due" type="number" {...register('dueDay', { valueAsNumber: true })} placeholder="Ex: 05" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          {errors.dueDay && <p className="text-red-500 text-xs mt-1">{errors.dueDay.message}</p>}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <button type="button" onClick={onBack} className="py-2 px-6 text-gray-700 rounded-md hover:bg-gray-100">
          &larr; Voltar
        </button>
        <div>
          <button type="button" onClick={() => onNext({})} className="py-2 px-6 text-indigo-600 rounded-md hover:bg-indigo-50 mr-2">
            Pular
          </button>
          <button type="submit" className="py-2 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Próximo &rarr;
          </button>
        </div>
      </div>
    </form>
  );
}
