# Feature: Orçamento Mensal

## Visão Geral

Sistema completo de orçamento mensal que permite ao usuário definir um limite de gastos e acompanhar o progresso em tempo real, com cálculos automáticos de quanto pode gastar por dia.

---

## Arquitetura

### 1. Schema do Banco de Dados

**Arquivo:** `supabase/sql/030_budgets.sql`

```sql
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);
```

**Características:**
- RLS habilitado: usuários só acessam seus próprios orçamentos
- Constraint única: apenas um orçamento por usuário/mês
- Valores em centavos (bigint)
- Índice otimizado: `idx_budgets_user_id_month`

---

### 2. Camada de Serviços

**Arquivo:** `src/services/budgets.ts`

#### `getBudget(supabase, userId, monthStr)`
- **Entrada:** `monthStr` no formato `YYYY-MM`
- **Retorno:** `{ amountCents: number } | null`
- **Validação:** Formato do mês, autenticação do usuário

#### `setBudget(supabase, userId, { monthStr, amountCents })`
- **Entrada:** `monthStr` (YYYY-MM) e `amountCents` (number)
- **Comportamento:** Upsert (cria ou atualiza)
- **Validação:** Valor positivo, formato do mês

---

### 3. Integração com Dashboard de Finanças

**Arquivo:** `src/services/financeDashboard.ts`

A função `getPFMonthSummary` busca o orçamento em paralelo com outros dados:

```typescript
const [txRes, billsRes, budget] = await Promise.all([
  txPromise,
  billsPromise,
  getBudget(supabase, userId, monthStr),
]);

return {
  ...summary,
  budgetCents: budget?.amountCents || 0,
};
```

**Tipo:** `PFMonthSummary` agora inclui `budgetCents: number`

---

### 4. Interface do Usuário

**Arquivo:** `src/app/page.tsx`

#### Componente `BudgetCard`

**Características:**
- Edição inline (sem navegação)
- `useMutation` do TanStack Query para salvamento
- Invalidação de cache após sucesso
- Feedback visual com toast
- Barra de progresso colorida (verde/amarelo/vermelho)

**Fluxo de Salvamento:**
1. Usuário clica em "Definir/Editar orçamento"
2. Insere valor usando `CurrencyInput` (conversão automática para centavos)
3. Submete o formulário via RHF (`handleSubmit`)
4. `useMutation` chama `setBudget` com `number` (centavos)
5. Em caso de sucesso:
   - Atualização otimista do cache via `setQueryData`
   - Invalidação do cache via `invalidateQueries`
   - Toast de sucesso
   - Dashboard atualiza automaticamente (sem reload)

**Formulário:**
```tsx
<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
  <Controller
    control={form.control}
    name="budgetCents"
    render={({ field }) => (
      <CurrencyInput
        value={field.value ?? 0}
        onChange={(nextCents) => field.onChange(nextCents)}
      />
    )}
  />
  <button type="submit" disabled={saveBudget.isPending}>
    Salvar
  </button>
</form>
```

---

### 5. Componente `CurrencyInput`

**Arquivo:** `src/components/ui/CurrencyInput.tsx`

**Assinatura:**
```typescript
type CurrencyInputProps = {
  value: number;                 // centavos
  onChange: (cents: number) => void; // centavos
  // ... outros props
};
```

**Funcionamento:**
- Exibe valor formatado como BRL (R$ 1.234,56)
- Aceita entrada de texto livre
- Converte automaticamente para centavos usando `parseBRL`
- Chama `onChange` sempre com `number` (centavos)

---

## Cálculos Baseados em Orçamento

### 1. Progresso do Orçamento

```typescript
const budgetSpentCents = summary.totalExpenseCents;
const budgetLeftCents = Math.max(0, budgetCents - budgetSpentCents);
const budgetProgressPct = budgetCents > 0 
  ? Math.min(100, (budgetSpentCents / budgetCents) * 100) 
  : 0;
```

### 2. "Pode Gastar Hoje"

```typescript
const daysLeft = Math.max(1, daysInMonth - today + 1);

const canSpendTodayCents = budgetCents > 0 
  ? Math.max(0, Math.floor(budgetLeftCents / daysLeft))
  : Math.max(0, Math.floor((sdmCents - summary.totalExpenseCents) / daysLeft));
```

**Lógica:**
- Se há orçamento definido: usa `budgetLeftCents / diasRestantes`
- Caso contrário: usa SDM como fallback
- O tooltip no card explica qual método está sendo usado

---

## Fluxo de Dados

```
[Usuário] 
   ↓ define orçamento
[BudgetCard Form (RHF + Zod)]
   ↓ submete (number em centavos)
[useMutation]
   ↓ chama setBudget
[Supabase] budgets.upsert
   ↓ sucesso
[queryClient.setQueryData] (atualização otimista)
   ↓
[queryClient.invalidateQueries] (refetch)
   ↓
[useFinanceDashboard] (dados atualizados)
   ↓
[Dashboard UI] (renderiza com novo valor)
```

---

## Validações

### Schema Zod
```typescript
const budgetSchema = z.object({
  budgetCents: z.number().int().nonnegative('Orçamento deve ser maior ou igual a zero'),
});
```

### Serviço
- Formato do mês: `/^\d{4}-\d{2}$/`
- Valor positivo: `Number.isFinite(amountCents) && amountCents > 0`
- Usuário autenticado: `userId` obrigatório

---

## Estados da UI

### Card (Modo Visualização)
- Exibe valor formatado ou "Não definido"
- Barra de progresso (se orçamento definido)
- Percentual gasto
- Botão "Definir/Editar orçamento"

### Card (Modo Edição)
- Formulário com `CurrencyInput`
- Validação em tempo real (`mode: 'onChange'`)
- Botões "Salvar" (com loading) e "Cancelar"
- Mensagens de erro do Zod

### Feedback
- Toast de sucesso (3 segundos)
- Toast de erro (5 segundos)
- Botão desabilitado durante salvamento

---

## Boas Práticas Implementadas

1. **Tipagem Forte:** Todos os valores monetários são `number` (centavos)
2. **Validação Múltipla:** Client-side (Zod) + Server-side (serviço)
3. **UX Otimista:** Cache atualizado imediatamente, refetch em background
4. **Sem Reload:** Form usa `handleSubmit` + `noValidate`
5. **Acessibilidade:** Botões com `type` explícito, labels associados
6. **Performance:** Queries em paralelo, cache de 5 minutos
7. **Segurança:** RLS no banco, validação de entrada

---

## Testes Manuais Recomendados

1. ✅ Definir orçamento → salvar → verificar que dashboard atualiza sem reload
2. ✅ Editar orçamento → salvar → verificar nova barra de progresso
3. ✅ Inserir valor inválido → verificar mensagem de erro
4. ✅ Cancelar edição → verificar que valor não muda
5. ✅ Recarregar página → verificar que orçamento persiste
6. ✅ Mudar de mês → verificar que orçamento é específico do mês
7. ✅ Verificar no Supabase → linha em `budgets` com `amount_cents` correto

---

## Próximas Melhorias Sugeridas

1. **Orçamentos por Categoria:** Permitir orçamento específico por tipo de gasto
2. **Histórico:** Gráfico de evolução do orçamento mês a mês
3. **Alertas:** Notificação quando atingir 80%, 90%, 100% do orçamento
4. **Orçamento Anual:** Visão agregada de todos os meses
5. **Sugestão Inteligente:** IA sugere orçamento baseado em histórico
6. **Export:** Relatório PDF/CSV com análise de orçamento vs realizado

---

## Referências

- **Documentação Principal:** `docs/documentacao.md`
- **Arquitetura de Dados:** `docs/documentacao.md` → Seção 5
- **Convenções Monetárias:** `src/lib/money.ts`
- **Schema Completo:** `supabase/sql/030_budgets.sql`





