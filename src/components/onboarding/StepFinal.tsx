// /src/components/onboarding/StepFinal.tsx
'use client';

// Propósito: Componente para o último passo do onboarding,
// configurando uma despesa fixa padrão e uma oferta digital opcional.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema de validação com Zod
// A despesa fixa sugerida agora se chama "Conta Fixa" (Fixed Bill).
const finalSchema = z.object({
  fixedBillName: z.string().min(2, 'Nome muito curto'),
  fixedBillAmount: z.string().regex(/^[0-9.\s]*,?[0-9]{0,2}$/, 'Valor inválido'),
  fixedBillDayOfMonth: z.number().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  digitalOfferName: z.string().optional(),
});

type FinalFormData = z.infer<typeof finalSchema>;

interface StepFinalProps {
    onFinish: (data: any) => void;
    onBack: () => void;
}

export default function StepFinal({ onFinish, onBack }: StepFinalProps) {
  const { register, handleSubmit } = useForm<FinalFormData>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
        fixedBillName: 'Parcela Mac',
        fixedBillAmount: 'R$ 700,00',
        fixedBillDayOfMonth: 9,
    }
  });

  return (
    <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">3. Últimos Ajustes</h2>
      
      {/* Seção de Despesas Fixas */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">Conta Fixa Sugerida</h3>
        <p className="text-sm text-gray-600 mb-4">Adicionamos uma conta recorrente como exemplo. Você poderá editar ou remover depois.</p>
        <div className="grid grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-500">Nome</label>
                <input {...register('fixedBillName')} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500">Valor</label>
                <input {...register('fixedBillAmount')} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500">Dia do Vencimento</label>
                <input type="number" {...register('fixedBillDayOfMonth', { valueAsNumber: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
            </div>
        </div>
      </div>

      {/* Seção de Oferta Digital */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">Aba Digital (Opcional)</h3>
        <p className="text-sm text-gray-600 mb-4">Se você trabalha com marketing digital, pode começar a rastrear o desempenho de uma oferta.</p>
        <div>
            <label htmlFor="digitalOffer" className="block text-sm font-medium text-gray-700">Nome da Oferta</label>
            <input id="digitalOffer" {...register('digitalOfferName')} placeholder="Ex: Ebook de Finanças" className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <button type="button" onClick={onBack} className="py-2 px-6 text-gray-700 rounded-md hover:bg-gray-100">
          &larr; Voltar
        </button>
        <button type="submit" className="py-2 px-6 bg-green-600 text-white rounded-md hover:bg-green-700">
          Concluir &rarr;
        </button>
      </div>
    </form>
  );
}
