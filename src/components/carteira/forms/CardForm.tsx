// ============================================================================
// CardForm - Formulário de Cartão (Criar/Editar)
// ============================================================================
// PROPÓSITO:
// - Formulário reutilizável para criar ou editar cartões de crédito
// - Validação com Zod + React Hook Form
// - Suporta modo Criar e Editar (detectado por defaultValues)
//
// PROPS:
// - defaultValues?: { id, name, closing_day, due_day, limit_cents }
// - onClose?: () => void - Callback após salvar com sucesso
//
// VALIDAÇÕES:
// - Nome: mínimo 2 caracteres
// - closing_day: 1-28 (dia de fechamento da fatura)
// - due_day: 1-28 (dia de vencimento da fatura)
// - limit_cents: opcional, valor em centavos
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries de cartões e faturas
// - Chama onClose (para fechar drawer)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useCreateCard, useUpdateCard } from '@/hooks/finance/cards';
import CurrencyInputIncremental from '@/components/form/CurrencyInputIncremental';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Informe um nome'),
  // Dias: z.coerce não é necessário porque usamos valueAsNumber no register
  closing_day: z.number().int().min(1).max(28),
  due_day: z.number().int().min(1).max(28),
  limit_cents: z.number().optional().nullable(),
});

type Values = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────────
export default function CardForm({
  defaultValues,
  onClose,
}: {
  defaultValues?: Partial<Values & { id: string }>;
  onClose?: () => void;
}) {
  const isEdit = Boolean(defaultValues?.id);
  const create = useCreateCard();
  const update = useUpdateCard();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      closing_day: Number(defaultValues?.closing_day ?? 1),
      due_day: Number(defaultValues?.due_day ?? 10),
      limit_cents:
        typeof defaultValues?.limit_cents === 'number'
          ? (defaultValues?.limit_cents as number)
          : 0,
    },
  });

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(v: Values) {
    try {
      if (isEdit && defaultValues?.id) {
        await update.mutateAsync({ id: defaultValues.id, input: v });
        toast.success('Cartão atualizado!');
      } else {
        await create.mutateAsync(v);
        toast.success('Cartão criado!');
      }
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar cartão');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Nome
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Nome *</label>
        <input
          {...register('name')}
          autoFocus
          placeholder="ex.: Nubank, Inter, Visa Corporate…"
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Fechamento + Vencimento
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">
            Dia de fechamento (1–28) *
          </label>
          {/* 
            IMPORTANTE: Inputs type="number" nativos retornam string!
            - valueAsNumber: true → converte automaticamente string → number
            - setValueAs: evita que campo vazio ("") vire string vazia no Zod
          */}
          <input
            type="number"
            min={1}
            max={28}
            {...register('closing_day', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          />
          {errors.closing_day && (
            <p className="text-red-400 text-xs mt-1">
              {errors.closing_day.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm text-[#CACACA] block mb-1">
            Dia de vencimento (1–28) *
          </label>
          <input
            type="number"
            min={1}
            max={28}
            {...register('due_day', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          />
          {errors.due_day && (
            <p className="text-red-400 text-xs mt-1">
              {errors.due_day.message}
            </p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Limite (opcional)
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Limite (opcional)
        </label>
        <Controller
          name="limit_cents"
          control={control}
          render={({ field }) => (
            <CurrencyInputIncremental
              value={typeof field.value === 'number' ? field.value : 0}
              onValueChange={(c) => field.onChange(c)}
              placeholder="ex.: R$ 5.000,00"
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
            />
          )}
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
            : 'Criar cartão'}
      </button>
    </form>
  );
}



