// /src/components/onboarding/StepAccounts.tsx
'use client';

// Propósito: Componente para o primeiro passo do onboarding,
// onde o usuário cadastra suas contas iniciais.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema de validação com Zod
// - `name`: Obrigatório, com no mínimo 2 caracteres.
// - `balanceBRL`: Obrigatório, validado com regex para aceitar formatos de moeda BRL.
const accountSchema = z.object({
  name: z.string().min(2, 'O nome da conta é obrigatório.'),
  balanceBRL: z.string().regex(/^[0-9.\s]*,?[0-9]{0,2}$/, 'Valor inválido'),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface StepAccountsProps {
    onNext: (data: any) => void;
}

export default function StepAccounts({ onNext }: StepAccountsProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });

  // A função `onNext` será chamada com os dados do formulário
  // para serem gerenciados pelo componente pai (a página de onboarding).
  const onSubmit = (data: AccountFormData) => {
    // FUTURO: Aqui os dados seriam convertidos (ex: R$ -> centavos) e persistidos.
    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">1. Adicione suas Contas</h2>
      <p className="text-gray-600">Comece adicionando suas contas correntes, carteiras ou poupanças.</p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nome da Conta
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          placeholder="Ex: Carteira, Banco Principal"
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="balanceBRL" className="block text-sm font-medium text-gray-700">
          Saldo Inicial (R$)
        </label>
        <input
          id="balanceBRL"
          type="text"
          {...register('balanceBRL')}
          placeholder="1.234,56"
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
        {errors.balanceBRL && <p className="text-red-500 text-xs mt-1">{errors.balanceBRL.message}</p>}
      </div>
      
      <div className="flex justify-end">
        <button type="submit" className="py-2 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Próximo &rarr;
        </button>
      </div>
    </form>
  );
}



