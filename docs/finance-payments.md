# 📊 Arquitetura de Pagamentos e Métricas Financeiras - NoCry Finance

**Criado em:** 2025-01-11  
**Objetivo:** Documentar a arquitetura atual e implementar separação entre **compras no cartão** (não são saídas de caixa) e **pagamentos de fatura** (SÃO saídas de caixa).

---

## 🎯 Problema a Resolver

### ❌ Comportamento Atual (Errado)
- **Total Saídas** soma compras de cartão diretamente
- Compra no cartão = saída de caixa imediata
- Fatura em aberto conta como saída
- **Resultado:** Despesas duplicadas e métricas incorretas

### ✅ Comportamento Desejado (Correto)
- **Total Saídas** = apenas dinheiro que SAIU da conta
- Compra no cartão = NÃO é saída (é compromisso futuro)
- Pagamento de fatura = SIM é saída de caixa
- **Fatura Atual** = compras pendentes de pagamento
- **Resultado:** Regime de caixa real, sem duplicação

---

## 🗂️ Mapeamento da Arquitetura Atual

### 1️⃣ **TABELAS DO BANCO DE DADOS**

#### `accounts` (Contas Bancárias)
```sql
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  initial_balance_cents bigint DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
```
- **Propósito:** Contas correntes, carteiras, poupanças (dinheiro real)
- **RLS:** `auth.uid() = user_id`
- **Índices:** `user_id`

#### `cards` (Cartões de Crédito)
```sql
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  limit_cents bigint NOT NULL,
  closing_day smallint NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day smallint NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  created_at timestamptz DEFAULT now() NOT NULL
);
```
- **Propósito:** Cartões de crédito com ciclo de fatura
- **RLS:** `auth.uid() = user_id`
- **Índices:** `user_id`

#### `transactions` (Movimentações)
```sql
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type in ('expense','income','transfer')),
  account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id uuid NULL REFERENCES public.cards(id) ON DELETE SET NULL,
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  occurred_at date NOT NULL,
  description text NULL,
  transfer_group_id uuid NULL,
  reconciled boolean DEFAULT false,
  installment_index int NULL,
  installment_total int NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
```
- **Propósito:** TODAS as movimentações (compras, receitas, transferências)
- **Problema:** NÃO distingue compra de cartão de pagamento de fatura
- **RLS:** `auth.uid() = user_id`
- **Índices:** `user_id`, `occurred_at`, `account_id`, `card_id`, `category_id`

#### `categories` (Categorias)
```sql
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type in ('expense','income')),
  created_at timestamptz DEFAULT now() NOT NULL
);
```
- **Propósito:** Categorias personalizadas por usuário
- **RLS:** `auth.uid() = user_id`

---

### 2️⃣ **VIEWS SQL**

#### `pf_month_summary`
```sql
-- Resumo do mês corrente (receitas, despesas, líquido)
-- PROBLEMA: Soma TODAS as transactions.type='expense', incluindo compras de cartão
```
- **Arquivo:** `supabase/sql/020_financas.sql` (linhas 97-137)
- **Usado por:** Antigo sistema (não mais usado ativamente)
- **Problema:** NÃO exclui compras de cartão

#### `card_invoices_current`
```sql
-- Calcula fatura ATUAL de cada cartão:
-- - cycle_start/cycle_end baseado em closing_day
-- - Soma transactions WHERE card_id=X AND type='expense' AND occurred_at BETWEEN cycle
-- - Retorna: amount_cents, due_date, days_to_due
```
- **Arquivo:** `supabase/sql/020_financas.sql` (linhas 148-217)
- **Usado por:** Cards do dashboard, página /carteiras
- **Status:** ✅ Funciona corretamente (mas não há sistema de pagamento)

#### `pf_fixed_remaining_current_month`
```sql
-- Calcula contas fixas restantes (não lançadas) do mês atual
```
- **Arquivo:** `supabase/sql/026_fixed_remaining_view.sql` + `044_fix_fixed_remaining_view.sql`
- **Usado por:** SDM (Projetado)

---

### 3️⃣ **SERVIÇOS (Services)**

#### `src/services/analytics.ts`
**Função:** `getNetByPeriod(date_from, date_to)`
- **Usado por:** Card "Saldo Líquido" do Dashboard
- **Query:** 
  ```ts
  supabase
    .from('transactions')
    .select('type, amount_cents, card_id')
    .in('type', ['income', 'expense'])
    .gte('occurred_at', date_from)
    .lte('occurred_at', date_to)
  ```
- **Filtro Frontend:** ✅ **JÁ EXCLUI compras de cartão**
  ```ts
  if (tx.type === 'expense' && tx.card_id === null) {
    total_expense_cents += tx.amount_cents; // Só conta se NÃO for cartão
  }
  ```
- **Status:** ✅ Implementação correta (regime de caixa)

#### `src/services/cards.ts`
**Função:** `listCurrentInvoices()`
- **Query:** Busca da view `card_invoices_current`
- **Retorno:** Faturas atuais de todos os cartões
- **Status:** ✅ Funciona

**Função:** `listCurrentInvoiceTransactions(card_id)`
- **Query:** Transações do ciclo atual de um cartão
- **Status:** ✅ Funciona

#### `src/services/financeDashboard.ts`
**Função:** `getPFMonthSummary(supabase, userId, monthStr)`
- **Usado por:** Sistema antigo (não mais usado ativamente)
- **Status:** ⚠️ Depreciado

---

### 4️⃣ **HOOKS (React Query)**

#### `src/hooks/finance/sdm.ts`
**Hook:** `useSaldoLiquido()`
- **Usado por:** `SaldoLiquidoCard`, `SdmProjectedCard`
- **Query:** Busca transactions do mês atual
- **Filtro Frontend:** ✅ **JÁ EXCLUI compras de cartão**
  ```ts
  if (tx.type === 'expense' && tx.card_id === null) {
    total_expense_cents += tx.amount_cents; // Regime de caixa
  }
  ```
- **Status:** ✅ Implementação correta

**Hook:** `useCurrentInvoicesTotal()`
- **Usado por:** `SdmProjectedCard`
- **Query:** Soma faturas de `card_invoices_current`
- **Status:** ✅ Funciona

**Hook:** `useFixedRemaining()`
- **Usado por:** `SdmProjectedCard`
- **Query:** Busca de `pf_fixed_remaining_current_month`
- **Status:** ✅ Funciona (corrigido em `044_fix_fixed_remaining_view.sql`)

#### `src/hooks/dashboard/useFinanceKpis.ts`
**Hook:** `useFinanceKpis({ from, to, userId })`
- **Usado por:** `DashboardKpis` para cards "Total Saídas" e "Total Entradas"
- **Query:**
  ```ts
  supabase
    .from('transactions')
    .select('type, amount_cents, description')
    .eq('user_id', userId)
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .in('type', ['income', 'expense'])
  ```
- **❌ PROBLEMA:** NÃO filtra `card_id`, soma TODAS as expenses
  ```ts
  transactions?.forEach((tx) => {
    if (tx.type === 'expense') {
      expenseCents += tx.amount_cents; // ❌ Inclui compras de cartão!
    }
  });
  ```
- **Status:** ❌ **BUGADO** - Soma compras de cartão em "Total Saídas"

#### `src/hooks/finance/cards.ts`
**Hook:** `useCurrentInvoices()`
- **Query:** Busca de `card_invoices_current`
- **Status:** ✅ Funciona

**Hook:** `useCurrentInvoiceDetail(cardId)`
- **Query:** Busca transações de uma fatura específica
- **Status:** ✅ Funciona

#### `src/hooks/analytics.ts`
**Hook:** `useNetByPeriod(from, to)`
- **Service:** Chama `getNetByPeriod` de `services/analytics.ts`
- **Status:** ✅ Implementação correta (regime de caixa)

---

### 5️⃣ **COMPONENTES (UI)**

#### `src/components/dashboard/DashboardKpis.tsx`
**Propósito:** Container dos cards de KPIs
- **Cards Renderizados:**
  1. `SaldoLiquidoCard` (usa `useNetByPeriod`) ✅ CORRETO
  2. `KpiCard` "Total Saídas" (usa `useFinanceKpis`) ❌ BUGADO
  3. `KpiCard` "Total Entradas" (usa `useFinanceKpis`) ✅ CORRETO
  4. `BudgetCard` (usa `useBudget`)
  5. `InvoiceCard` (usa `useCurrentInvoices`) ✅ CORRETO
  6. `NextBillCard` (usa `useNextBill`)

#### `src/components/dashboard/kpis/SaldoLiquidoCard.tsx`
- **Hook:** `useNetByPeriod(from, to)`
- **Cálculo:** `net_cents = total_income_cents - total_expense_cents`
- **Status:** ✅ CORRETO (regime de caixa)
- **Color:** ✅ Verde se >= 0, vermelho se < 0

#### `src/components/dashboard/kpis/SdmProjectedCard.tsx`
- **Hooks:**
  - `useSaldoLiquido()` → net_cents
  - `useFixedRemaining()` → fixed_remaining_cents
  - `useCurrentInvoicesTotal()` → invoices_current_total_cents
- **Cálculo:** `sdm = net - fixedRest - invoicesAmount`
- **❌ PROBLEMA:** Deduz fatura aberta (que ainda não foi paga)
- **Status:** ❌ **BUGADO** - Conta fatura como saída antes do pagamento

#### `src/components/dashboard/kpis/InvoiceCard.tsx`
- **Props:** `invoice` (fatura agregada)
- **Exibe:** Valor total das faturas + próximo vencimento
- **Status:** ✅ Funciona

#### `src/components/carteira/tabs/WalletCardsTab.tsx`
- **Hooks:**
  - `useCardsList(q)` → lista de cartões
  - `useCurrentInvoices()` → faturas atuais
  - `useCurrentInvoiceDetail(viewCardId)` → detalhes da fatura
- **Funcionalidades:**
  - Lista cartões com fatura atual
  - Botão "Ver faturas" (abre drawer com detalhes)
  - ❌ **FALTANDO:** Botão "Pagar fatura"
- **Status:** ⚠️ Falta implementar pagamento

---

### 6️⃣ **FLUXO ATUAL DE DADOS**

```
┌─────────────────────────────────────────────────────────────────┐
│                      TABELA: transactions                        │
│  ┌──────────────────────┬──────────────────────────────────┐   │
│  │ Tipo                 │ account_id   │ card_id           │   │
│  ├──────────────────────┼──────────────┼───────────────────┤   │
│  │ Receita (income)     │ X            │ NULL              │   │
│  │ Despesa (expense)    │ X            │ NULL              │   │
│  │ Compra cartão        │ NULL         │ X                 │   │
│  │ Transferência        │ X            │ NULL (2 linhas)   │   │
│  └──────────────────────┴──────────────┴───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                  QUERIES (Hooks + Services)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ useFinanceKpis (Total Saídas)                           │   │
│  │   SELECT * FROM transactions                            │   │
│  │   WHERE type IN ('income', 'expense')                   │   │
│  │   ❌ NÃO FILTRA card_id                                 │   │
│  │   → Soma compras de cartão em "Total Saídas"           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ useNetByPeriod (Saldo Líquido)                          │   │
│  │   SELECT * FROM transactions                            │   │
│  │   WHERE type IN ('income', 'expense')                   │   │
│  │   ✅ FILTRA NO FRONTEND: card_id IS NULL                │   │
│  │   → Exclui compras de cartão (regime de caixa)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ useCurrentInvoices (Fatura Atual)                       │   │
│  │   SELECT * FROM card_invoices_current                   │   │
│  │   ✅ Calcula fatura aberta por cartão                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (UI)                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CARD: Total Saídas                                       │  │
│  │   ❌ kpis?.expenseCents (BUGADO)                         │  │
│  │   → Inclui compras de cartão                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CARD: Saldo Líquido (Filtrado)                           │  │
│  │   ✅ data?.net_cents (CORRETO)                           │  │
│  │   → Exclui compras de cartão                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CARD: Fatura Atual                                       │  │
│  │   ✅ invoices?.amountCents (CORRETO)                     │  │
│  │   → Valor em aberto da fatura                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CARD: SDM (Projetado)                                    │  │
│  │   ❌ net - fixedRest - invoicesAmount (BUGADO)           │  │
│  │   → Deduz fatura aberta (que ainda não foi paga)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Plano de Implementação

### Fase 1: Mapeamento e Documentação ✅
- [x] Documentar arquitetura atual
- [x] Identificar todos os bugs
- [x] Criar este documento

### Fase 2: Correção de Bugs Críticos (RÁPIDO)
- [ ] **BUG 1:** Corrigir `useFinanceKpis` para excluir compras de cartão
  - Adicionar filtro `card_id IS NULL` para expenses
  - Arquivo: `src/hooks/dashboard/useFinanceKpis.ts`
- [ ] **BUG 2:** Corrigir `SdmProjectedCard` para NÃO deduzir fatura aberta
  - Remover `invoicesAmount` do cálculo do SDM
  - SDM deve ser: `net - fixedRest` (sem fatura)
  - Arquivo: `src/components/dashboard/kpis/SdmProjectedCard.tsx`

### Fase 3: Novo Modelo de Dados (MÉDIO)
- [ ] Criar tabela `invoice_payments` para registrar pagamentos de fatura
  ```sql
  CREATE TABLE invoice_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    paid_at date NOT NULL,
    source_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    notes text NULL,
    created_at timestamptz DEFAULT now() NOT NULL
  );
  ```
- [ ] Adicionar RLS e índices
- [ ] Criar view `card_invoices_with_payments` que calcula:
  - `total_charges_cents` (compras do ciclo)
  - `total_payments_cents` (pagamentos do ciclo)
  - `balance_cents` (charges - payments)

### Fase 4: Server Action para Pagar Fatura (MÉDIO)
- [ ] Criar `src/app/api/invoices/pay/route.ts` (API Route)
  - Validar usuário, card_id, amount, source_account_id
  - Inserir em `invoice_payments`
  - Criar `transaction` tipo `expense` na `source_account_id` (saída de caixa)
  - Retornar novo saldo da fatura
- [ ] Adicionar validações:
  - `amount <= saldo_fatura_aberta`
  - `amount > 0`
  - `source_account_id` pertence ao usuário

### Fase 5: UI para Pagar Fatura (MÉDIO)
- [ ] Criar `src/components/carteira/modals/PayInvoiceModal.tsx`
  - Input: Valor a pagar (pré-preenchido com total ou mínimo)
  - Select: Conta de origem (com saldos)
  - Date: Data do pagamento (default = hoje)
  - Textarea: Observação (opcional)
  - Atalhos: 25%, 50%, 75%, 100%
  - Validações: `amount <= saldo_fatura`, `amount > 0`
- [ ] Adicionar botão "Pagar fatura" em `WalletCardsTab.tsx`
  - Ao lado de "Ver faturas"
  - Desabilitar se `amount_cents == 0`
  - Tooltip se não houver fatura aberta

### Fase 6: Atualizar Queries e Métricas (RÁPIDO)
- [ ] Atualizar `useFinanceKpis` para incluir pagamentos de fatura em "Total Saídas"
- [ ] Atualizar `SdmProjectedCard` para usar novo cálculo

### Fase 7: Testes e Validação (RÁPIDO)
- [ ] Testar fluxo completo:
  1. Criar compra no cartão → NÃO deve aparecer em "Total Saídas"
  2. Pagar fatura → DEVE aparecer em "Total Saídas"
  3. Verificar "Fatura Atual" diminui após pagamento
  4. Verificar "Saldo Líquido" deduz pagamento
- [ ] Build sem erros
- [ ] Verificar RLS

---

## 📝 Decisões de Design

### 1️⃣ **Regime de Caixa vs. Competência**
- **Escolha:** Regime de Caixa (cash basis)
- **Motivo:** Usuário quer saber quanto dinheiro **realmente saiu**
- **Impacto:**
  - Compra no cartão = NÃO conta como saída
  - Pagamento de fatura = Conta como saída

### 2️⃣ **Tabela Separada vs. Flag em Transactions**
- **Escolha:** Tabela separada `invoice_payments`
- **Motivo:** 
  - Melhor semântica (pagamento ≠ compra)
  - Facilita queries específicas
  - Evita confusão com `transactions`
- **Alternativa rejeitada:** Adicionar flag `is_invoice_payment` em `transactions`

### 3️⃣ **Pagamento Parcial vs. Total**
- **Escolha:** Permitir ambos
- **Motivo:** Flexibilidade para o usuário
- **Implementação:** Múltiplos registros em `invoice_payments` para o mesmo ciclo

### 4️⃣ **SDM (Projetado) deve deduzir fatura?**
- **Escolha:** NÃO
- **Motivo:** Fatura é compromisso futuro, não saída de caixa
- **Novo SDM:** `net - fixedRest` (sem fatura)
- **Alternativa:** Criar card separado "Disponível após contas" que deduz fatura

---

## 🎯 Critérios de Aceite

- [ ] Total Saídas NÃO inclui compras de cartão
- [ ] Total Saídas INCLUI pagamentos de fatura
- [ ] Fatura Atual mostra valor em aberto (compras - pagamentos)
- [ ] Botão "Pagar fatura" funcional em /carteiras
- [ ] Modal de pagamento com validações
- [ ] Pagamento cria registro em `invoice_payments` + `transaction`
- [ ] Saldo Líquido deduz pagamento de fatura
- [ ] SDM (Projetado) NÃO deduz fatura aberta
- [ ] Build sem erros
- [ ] RLS configurado corretamente
- [ ] Nenhum regressivo em funcionalidades existentes

---

## 📚 Referências

### Arquivos-Chave
- **Schema:** `supabase/sql/020_financas.sql`, `003_personal_finance.sql`
- **Services:** `src/services/analytics.ts`, `src/services/cards.ts`
- **Hooks:** `src/hooks/dashboard/useFinanceKpis.ts`, `src/hooks/finance/sdm.ts`
- **Components:** `src/components/dashboard/DashboardKpis.tsx`, `src/components/carteira/tabs/WalletCardsTab.tsx`

### Views SQL
- `pf_month_summary` (depreciada)
- `card_invoices_current` (em uso)
- `pf_fixed_remaining_current_month` (em uso)

---

**Próximo Passo:** Implementar Fase 2 (Correção de Bugs Críticos) 🚀

