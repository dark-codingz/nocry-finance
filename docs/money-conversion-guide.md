# Guia de Conversão de Valores Monetários - NoCry Finance

## 📋 Visão Geral

Este guia documenta como lidar com valores monetários na aplicação, desde a entrada do usuário até o armazenamento no banco de dados.

---

## 🎯 Convenções

### Armazenamento
- **Banco de Dados:** `bigint` (centavos)
- **Serviços:** `number` (centavos)
- **Schema Zod:** Transforma `string | number` → `number` (centavos)

### Exibição
- **Input do Usuário:** `string` ("435,00", "1.200,50", "R$ 1.234,56")
- **Exibição na UI:** `string` formatada ("R$ 1.234,56")

---

## 🔧 Funções Utilitárias

### `toCents(input: string | number): number`

Converte qualquer valor de entrada para centavos.

```typescript
import { toCents } from '@/lib/money';

// Strings
toCents("435,00")        → 43500
toCents("1.234,56")      → 123456
toCents("R$ 1.200,50")   → 120050
toCents("1234")          → 123400

// Numbers
toCents(435)             → 43500
toCents(1234.56)         → 123456

// Inválidos
toCents("abc")           → NaN
toCents("")              → NaN
```

### `formatBRL(cents: number): string`

Formata centavos para string BRL.

```typescript
import { formatBRL } from '@/lib/money';

formatBRL(123456)  → "R$ 1.234,56"
formatBRL(43500)   → "R$ 435,00"
formatBRL(0)       → "R$ 0,00"
formatBRL(-5000)   → "-R$ 50,00"
```

### `parseBRL(input: string): number` [DEPRECATED]

**⚠️ Nota:** Use `toCents()` para novos desenvolvimentos.

```typescript
import { parseBRL } from '@/lib/money';

parseBRL("435,00")       → 43500
parseBRL("R$ 1.234,56")  → 123456
parseBRL("abc")          → 0  // Retorna 0 em vez de NaN (legacy behavior)
```

---

## 📝 Schema Zod com Transformação Automática

### Definição do Schema

```typescript
// src/types/transactions.ts
import { z } from 'zod';
import { toCents } from '@/lib/money';

export const transactionSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  
  // ═══════════════════════════════════════════════════════════
  // Campo de Valor: Aceita string OU number, converte para centavos
  // ═══════════════════════════════════════════════════════════
  amount: z.union([z.string(), z.number()])
    .transform((value) => {
      const cents = toCents(value as string | number);
      
      if (Number.isNaN(cents)) {
        throw new Error('Valor inválido. Use o formato: 1.234,56');
      }
      
      if (cents <= 0) {
        throw new Error('Valor deve ser maior que zero');
      }
      
      return cents; // Sempre retorna centavos (number)
    }),
  
  occurredAt: z.preprocess(
    (v) => (typeof v === 'string' ? new Date(v) : v),
    z.date()
  ),
  
  description: z.string().trim().max(500).optional(),
  accountId: z.string().uuid().optional().nullable(),
  cardId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  transferToAccountId: z.string().uuid().optional().nullable(),
})
.superRefine((data, ctx) => {
  // Validação XOR: account OU card (para expense/income)
  if (data.type !== 'transfer') {
    const hasAccount = !!data.accountId;
    const hasCard = !!data.cardId;
    
    if (hasAccount === hasCard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: 'Selecione uma conta OU um cartão (não ambos)',
      });
    }
  }
  
  // Validação para transferências
  if (data.type === 'transfer') {
    if (!data.accountId || !data.transferToAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferToAccountId'],
        message: 'Selecione contas de origem e destino',
      });
    }
    
    if (data.accountId === data.transferToAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferToAccountId'],
        message: 'As contas de origem e destino devem ser diferentes',
      });
    }
  }
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
// Result: { amount: number (centavos), ... }
```

---

## 🖥️ Implementação no Componente (React Hook Form)

### Setup Básico

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { transactionSchema, type TransactionFormData } from '@/types/transactions';
import { createTransaction } from '@/services/finance';

export default function TransactionForm() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      occurredAt: new Date(),
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    if (!userId) {
      alert('Você precisa estar logado');
      return;
    }

    try {
      // data.amount já está em centavos (number) graças ao Zod!
      await createTransaction(supabase, userId, {
        type: data.type,
        amount: data.amount, // number (centavos)
        occurredAt: data.occurredAt,
        description: data.description,
        accountId: data.accountId,
        cardId: data.cardId,
        categoryId: data.categoryId,
        transferToAccountId: data.transferToAccountId,
      });

      alert('Transação criada com sucesso!');
      reset();
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ══════════════════════════════════════════════════════════
          Campo de Valor (Input Simples)
          ══════════════════════════════════════════════════════════
          NOTA: O input aceita string ("435,00") e o Zod converte
          ══════════════════════════════════════════════════════════ */}
      <div>
        <label htmlFor="amount">Valor</label>
        <input
          id="amount"
          {...register('amount')}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="..."
        />
        {errors.amount && (
          <p className="text-red-400 text-xs">{errors.amount.message}</p>
        )}
      </div>

      {/* Outros campos... */}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

---

## 🎨 Input de Moeda Customizado (CurrencyInput)

Se você já tem um `CurrencyInput` controlado:

```typescript
import CurrencyInput from '@/components/ui/CurrencyInput';
import { Controller } from 'react-hook-form';

// No seu form component:
<Controller
  name="amount"
  control={control}
  render={({ field }) => (
    <CurrencyInput
      value={field.value}
      onChange={field.onChange}
      placeholder="0,00"
      className="..."
    />
  )}
/>
```

**IMPORTANTE:** Garanta que o `CurrencyInput`:
- Aceita `value: string | number`
- Chama `onChange` com a **string digitada** (ex: "435,00")
- **NÃO** converta para número internamente
- Deixe o Zod fazer a conversão via `transform`

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO DIGITA                                                │
│    Input: "1.234,56" (string)                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. REACT HOOK FORM                                               │
│    Valor no state: "1.234,56" (string)                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SUBMIT → ZOD SCHEMA                                           │
│    - Recebe: "1.234,56" (string)                                │
│    - Executa: toCents("1.234,56")                               │
│    - Valida: > 0 ? OK : erro                                    │
│    - Transforma: 123456 (number)                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. FUNÇÃO onSubmit                                               │
│    Recebe: { amount: 123456, ... } (number)                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SERVIÇO (finance.ts)                                          │
│    createTransaction(supabase, userId, {                        │
│      amount: 123456, // number (centavos)                       │
│      ...                                                         │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. SUPABASE INSERT                                               │
│    INSERT INTO transactions (amount_cents, ...)                 │
│    VALUES (123456, ...)                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. BANCO DE DADOS                                                │
│    amount_cents: 123456 (bigint)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

Ao adicionar um novo formulário monetário:

- [ ] Importar `toCents` e `formatBRL` de `@/lib/money`
- [ ] Criar schema Zod com `.transform()` usando `toCents`
- [ ] Validar `> 0` no transform
- [ ] Usar `TransactionFormData` type (inferido do schema)
- [ ] Input aceita `string` (não force `number` no HTML)
- [ ] `onSubmit` recebe `amount: number` (centavos)
- [ ] Serviço recebe `amount: number` (centavos)
- [ ] DB recebe `amount_cents: bigint`
- [ ] Exibição usa `formatBRL(cents)` para mostrar ao usuário

---

## 🚫 Erros Comuns e Soluções

### Erro: "Type 'string' is not assignable to type 'number'"

**Causa:** Tentando passar string diretamente para campo que espera number.

**Solução:** Use `.transform()` no schema Zod:

```typescript
amount: z.union([z.string(), z.number()])
  .transform((v) => {
    const cents = toCents(v as string | number);
    if (Number.isNaN(cents) || cents <= 0) {
      throw new Error('Valor inválido');
    }
    return cents;
  })
```

### Erro: "Valor inválido" ao submeter

**Causa:** Input enviando valor em formato não reconhecido.

**Solução:** Verifique se o input está enviando string no formato BRL correto:
- ✅ "435,00", "1.234,56", "R$ 1.200,50"
- ❌ "435.00" (ponto como decimal - use vírgula)
- ❌ undefined, null, ""

### Erro: Valor salvo incorretamente no DB

**Causa:** Salvando reais em vez de centavos.

**Solução:** Sempre use `toCents()` antes de salvar:

```typescript
// ❌ ERRADO
const value = 435.00;
await supabase.from('transactions').insert({ amount_cents: value });
// Salva 435 centavos = R$ 4,35 (ERRADO!)

// ✅ CORRETO
const cents = toCents("435,00"); // 43500
await supabase.from('transactions').insert({ amount_cents: cents });
// Salva 43500 centavos = R$ 435,00 (CORRETO!)
```

---

## 🧪 Testes

```typescript
import { toCents, formatBRL, parseBRL } from '@/lib/money';

describe('Money Utilities', () => {
  describe('toCents', () => {
    it('should convert BRL strings to cents', () => {
      expect(toCents("435,00")).toBe(43500);
      expect(toCents("1.234,56")).toBe(123456);
      expect(toCents("R$ 1.200,50")).toBe(120050);
    });

    it('should convert numbers to cents', () => {
      expect(toCents(435)).toBe(43500);
      expect(toCents(1234.56)).toBe(123456);
    });

    it('should return NaN for invalid inputs', () => {
      expect(toCents("abc")).toBeNaN();
      expect(toCents("")).toBeNaN();
    });
  });

  describe('formatBRL', () => {
    it('should format cents as BRL', () => {
      expect(formatBRL(123456)).toBe("R$ 1.234,56");
      expect(formatBRL(43500)).toBe("R$ 435,00");
      expect(formatBRL(0)).toBe("R$ 0,00");
    });
  });
});
```

---

## 📚 Referências

- **Tipos:** `src/types/transactions.ts`
- **Utilitários:** `src/lib/money.ts`
- **Serviços:** `src/services/finance.ts`
- **Componente Exemplo:** `src/app/transacoes/page.tsx`

---

**Última atualização:** 2025-01-24




