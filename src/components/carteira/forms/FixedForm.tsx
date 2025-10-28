// ============================================================================
// FixedForm - Formulário de Conta Fixa (Criar/Editar)
// ============================================================================
// PROPÓSITO:
// - Formulário reutilizável para criar ou editar contas fixas (recorrentes)
// - Validação com Zod + React Hook Form
// - Suporta modo Criar e Editar (detectado por defaultValues)
//
// PROPS:
// - defaultValues?: { id, name, type, amount_cents, due_day, account_id, card_id, category_id, active }
// - onClose?: () => void - Callback após salvar com sucesso
//
// VALIDAÇÕES:
// - Nome: mínimo 2 caracteres
// - Tipo: expense ou income
// - Valor: maior que zero
// - Dia: 1-28 (evita problemas com meses variáveis)
// - Conta OU Cartão (não ambos, pelo menos um)
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries de contas fixas
// - Chama onClose (para fechar drawer)
// ============================================================================

'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import {
  useCategoriesForSelect,
  useAccounts,
  useCards,
} from '@/hooks/finance/lookups';
import CurrencyInputIncremental from '@/components/form/CurrencyInputIncremental';
import { useCreateFixed, useUpdateFixed } from '@/hooks/finance/fixed';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Schema de Validação
// ────────────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    type: z.union([z.literal('expense'), z.literal('income')]),
    amount_cents: z.number().min(1, 'Informe um valor'),
    // due_day: Mantemos z.number() puro porque valueAsNumber no register já converte
    due_day: z.number().int().min(1).max(28),
    account_id: z.string().optional().nullable(),
    card_id: z.string().optional().nullable(),
    category_id: z.string().optional().nullable(),
    active: z.boolean().optional(),
  })
  .refine((v) => !(v.account_id && v.card_id), {
    path: ['account_id'],
    message: 'Escolha conta OU cartão (não ambos).',
  })
  .refine((v) => v.account_id || v.card_id, {
    path: ['account_id'],
    message: 'Informe conta ou cartão.',
  });

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────────
export default function FixedForm({
  defaultValues,
  onClose,
}: {
  defaultValues?: Partial<FormValues & { id: string }>;
  onClose?: () => void;
}) {
  const isEdit = Boolean(defaultValues?.id);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategoriesForSelect(
    defaultValues?.type as any
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: (defaultValues?.type as any) ?? 'expense',
      amount_cents: Number.isFinite(defaultValues?.amount_cents as any)
        ? (defaultValues?.amount_cents as any)
        : 0,
      // due_day: Garantir que seja número (inputs type="number" retornam string)
      due_day: Number(defaultValues?.due_day ?? 1),
      account_id: defaultValues?.account_id ?? null,
      card_id: defaultValues?.card_id ?? null,
      category_id: defaultValues?.category_id ?? null,
      active: defaultValues?.active ?? true,
    },
  });

  const create = useCreateFixed();
  const update = useUpdateFixed();

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && defaultValues?.id) {
        await update.mutateAsync({ id: defaultValues.id, input: values as any });
        toast.success('Fixa atualizada!');
      } else {
        await create.mutateAsync(values as any);
        toast.success('Fixa criada!');
      }
      onClose?.();
    } catch (e) {
      const error = e as { message?: string };
      toast.error(error.message || 'Erro ao salvar fixa');
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
          placeholder="ex.: Aluguel, Netflix, Salário…"
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Tipo + Dia
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Tipo *</label>
          <div className="mt-1 flex gap-3 text-sm text-[#CACACA]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="expense"
                {...register('type')}
                className="accent-[#D4AF37]"
              />
              Despesa
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="income"
                {...register('type')}
                className="accent-[#D4AF37]"
              />
              Receita
            </label>
          </div>
        </div>
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">
            Dia (1–28) *
          </label>
          {/* 
            IMPORTANTE: Inputs type="number" nativos retornam string, não number!
            - valueAsNumber: true → converte automaticamente string → number
            - setValueAs: evita que campo vazio ("") vire string vazia no Zod
            Sem isso, Zod recebe string e dispara "expected number, received string"
          */}
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
            <p className="text-red-400 text-xs mt-1">{errors.due_day.message}</p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Valor
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">Valor *</label>
        <Controller
          name="amount_cents"
          control={control}
          render={({ field }) => (
            <CurrencyInputIncremental
              value={typeof field.value === 'number' ? field.value : 0}
              onValueChange={(c) => field.onChange(c)}
              className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white placeholder:text-[#9F9D9D] focus:border-white/20 transition-colors"
            />
          )}
        />
        {errors.amount_cents && (
          <p className="text-red-400 text-xs mt-1">
            {errors.amount_cents.message}
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Conta / Cartão
          ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Conta</label>
          <select
            {...register('account_id')}
            onChange={(e) => {
              setValue('account_id', e.target.value || null);
              if (e.target.value) setValue('card_id', null);
            }}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          >
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-[#CACACA] block mb-1">Cartão</label>
          <select
            {...register('card_id')}
            onChange={(e) => {
              setValue('card_id', e.target.value || null);
              if (e.target.value) setValue('account_id', null);
            }}
            className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          >
            <option value="">—</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {errors.account_id && (
        <p className="text-red-400 text-xs -mt-2">{errors.account_id.message}</p>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Categoria (opcional)
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Categoria (opcional)
        </label>
        <select
          {...register('category_id')}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Ativa
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register('active')}
          defaultChecked
          className="accent-[#D4AF37]"
        />
        <span className="text-sm text-[#CACACA]">Ativa (lançar automaticamente)</span>
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
            : 'Criar fixa'}
      </button>
    </form>
  );
}

