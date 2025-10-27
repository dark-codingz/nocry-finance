// ============================================================================
// CategoryForm - Formulário de Categoria (Criar/Editar)
// ============================================================================
// PROPÓSITO:
// - Formulário reutilizável para criar ou editar categorias
// - Validação com Zod + React Hook Form
// - Suporta modo Criar e Editar (detectado por defaultValues)
//
// PROPS:
// - defaultValues?: { id, name, type } - Se fornecido, modo Editar
// - onClose?: () => void - Callback após salvar com sucesso
//
// VALIDAÇÕES:
// - Nome: mínimo 2 caracteres
// - Tipo: expense ou income (obrigatório)
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries de categorias
// - Chama onClose (para fechar drawer)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateCategory, useUpdateCategory } from '@/hooks/finance/categories';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  type: z.union([z.literal('expense'), z.literal('income')]),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────
export default function CategoryForm({
  defaultValues,
  onClose,
}: {
  defaultValues?: Partial<FormValues & { id: string }>;
  onClose?: () => void;
}) {
  const isEdit = Boolean(defaultValues?.name);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: (defaultValues?.type as any) ?? 'expense',
    },
  });

  const create = useCreateCategory();
  const update = useUpdateCategory();

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
        toast.success('Categoria atualizada!');
      } else {
        // Modo Criar
        await create.mutateAsync(values);
        toast.success('Categoria criada!');
      }

      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar categoria');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Nome da Categoria
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Nome</label>
        <input
          {...register('name')}
          placeholder="ex.: Mercado, Salário, Transporte…"
          autoFocus
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Tipo (Radio: Despesa / Receita)
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Tipo</label>
        <div className="mt-2 flex gap-4">
          <label className="inline-flex items-center gap-2 text-[#CACACA] text-sm cursor-pointer">
            <input
              type="radio"
              value="expense"
              {...register('type')}
              className="accent-[#D4AF37]"
            />
            <span>Despesa</span>
          </label>
          <label className="inline-flex items-center gap-2 text-[#CACACA] text-sm cursor-pointer">
            <input
              type="radio"
              value="income"
              {...register('type')}
              className="accent-[#D4AF37]"
            />
            <span>Receita</span>
          </label>
        </div>
        {errors.type && (
          <p className="text-red-400 text-xs mt-1">{errors.type.message}</p>
        )}
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
            : 'Criar categoria'}
      </button>
    </form>
  );
}

