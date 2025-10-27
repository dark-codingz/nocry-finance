// ============================================================================
// AccountForm - Formulário de Conta (Criar/Editar)
// ============================================================================
// PROPÓSITO:
// - Formulário reutilizável para criar ou editar contas
// - Validação com Zod + React Hook Form
// - Suporta modo Criar e Editar (detectado por defaultValues)
//
// PROPS:
// - defaultValues?: { id, name, notes } - Se fornecido, modo Editar
// - onClose?: () => void - Callback após salvar com sucesso
//
// VALIDAÇÕES:
// - Nome: mínimo 2 caracteres (obrigatório)
// - Observações: opcional
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries de contas
// - Chama onClose (para fechar drawer)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateAccount, useUpdateAccount } from '@/hooks/finance/accounts';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────────
export default function AccountForm({
  defaultValues,
  onClose,
}: {
  defaultValues?: Partial<FormValues & { id: string }>;
  onClose?: () => void;
}) {
  const isEdit = Boolean(defaultValues?.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  const create = useCreateAccount();
  const update = useUpdateAccount();

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && defaultValues?.id) {
        // Modo Editar
        await update.mutateAsync({
          id: defaultValues.id,
          input: values,
        });
        toast.success('Conta atualizada!');
      } else {
        // Modo Criar
        await create.mutateAsync(values);
        toast.success('Conta criada!');
      }

      onClose?.();
    } catch (e) {
      const error = e as { message?: string };
      toast.error(error.message || 'Erro ao salvar conta');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Nome da Conta
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Nome *</label>
        <input
          {...register('name')}
          autoFocus
          placeholder="ex.: Carteira, Nubank, Banco Inter…"
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Observações (Textarea)
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Observações (opcional)
        </label>
        <textarea
          {...register('notes')}
          rows={4}
          placeholder="Detalhes, agência, número da conta, hints…"
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors resize-none"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Botão Submit
          ════════════════════════════════════════════════════════════════ */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {isSubmitting
          ? 'Salvando…'
          : isEdit
            ? 'Salvar alterações'
            : 'Criar conta'}
      </button>
    </form>
  );
}


