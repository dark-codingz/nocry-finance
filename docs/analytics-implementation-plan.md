# 📋 Plano Detalhado de Implementação - Analytics

**Criado em:** 2025-01-11  
**Base:** `docs/analytics-architecture.md`  
**Objetivo:** Detalhar EXATAMENTE o que criar/modificar antes de escrever qualquer código.

---

## 🎯 FASE 1: MVP (Mergeável Rápido)

### ✅ ENTREGÁVEIS FASE 1
- [ ] Filtros Globais funcionais (URL state)
- [ ] 6 KPIs de Saúde (SR, DTI, Emergência, Runway, Orçamento, Crédito)
- [ ] 2 Gráficos de Flow (Linha Entradas/Saídas + S-curve Orçamento)
- [ ] 2 Gráficos de Categorias (Pareto + Desvio vs Orçamento)
- [ ] 1 Gauge de Crédito
- [ ] 1 Tabela Drill-down básica
- [ ] Views SQL (5 materialized + 1 normal)
- [ ] Cache + Invalidação
- [ ] Build sem erros

---

## 📁 ARQUIVOS A CRIAR (Fase 1)

### 1️⃣ **SQL (supabase/sql/)**

| Arquivo | Descrição | LOC | Dependências |
|---------|-----------|-----|--------------|
| `050_v_cash_movements_monthly.sql` | Materialized view: Agrega CAIXA por mês/conta/categoria | ~50 | `transactions` |
| `051_v_charges_monthly.sql` | Materialized view: Agrega COMPETÊNCIA por mês/cartão/categoria | ~50 | `transactions` |
| `052_v_statement_open.sql` | View: Saldo aberto por cartão (charges - payments) | ~40 | `cards`, `transactions`, `invoice_payments` |
| `053_v_budget_vs_actual.sql` | Materialized view: Orçamento x Realizado | ~70 | `budgets`, `transactions` |
| `054_v_kpis_core.sql` | Materialized view: KPIs pré-calculados (SR, burn rate) | ~60 | `transactions` |
| `056_refresh_materialized_views_function.sql` | Function: Refresh todas as views materializadas | ~30 | N/A |

**Total SQL:** ~300 LOC

---

### 2️⃣ **Services (src/services/analytics/)**

| Arquivo | Descrição | LOC | Exports |
|---------|-----------|-----|---------|
| `kpis.ts` | Busca KPIs de saúde (SR, DTI, Emergência, Runway) | ~150 | `getHealthKpis()` |
| `flow.ts` | Busca dados de Flow & Tendências (séries temporais) | ~120 | `getFlowData()` |
| `categories.ts` | Busca dados de categorias (Pareto, desvio) | ~100 | `getCategoriesData()` |
| `credit.ts` | Busca dados de crédito (gauge, timeline) | ~80 | `getCreditData()` |
| `drilldown.ts` | Busca dados para tabela dinâmica | ~90 | `getDrilldownData()` |

**Total Services:** ~540 LOC

---

### 3️⃣ **Hooks (src/hooks/analytics/)**

| Arquivo | Descrição | LOC | Exports |
|---------|-----------|-----|---------|
| `useAnalyticsFilters.ts` | Hook para filtros globais (URL state) | ~100 | `useAnalyticsFilters()` |
| `useKpisData.ts` | Hook para KPIs (React Query) | ~80 | `useKpisData()` |
| `useFlowData.ts` | Hook para Flow (React Query) | ~70 | `useFlowData()` |
| `useCategoriesData.ts` | Hook para Categorias (React Query) | ~70 | `useCategoriesData()` |
| `useCreditData.ts` | Hook para Crédito (React Query) | ~60 | `useCreditData()` |
| `useDrilldownData.ts` | Hook para Drill-down (React Query) | ~60 | `useDrilldownData()` |

**Total Hooks:** ~440 LOC

---

### 4️⃣ **Lib (src/lib/analytics/)**

| Arquivo | Descrição | LOC | Exports |
|---------|-----------|-----|---------|
| `formulas.ts` | Fórmulas de KPIs (SR, DTI, etc.) | ~150 | `calculateSavingsRatio()`, etc. |
| `cache-keys.ts` | Gerador de cache keys | ~50 | `getCacheKey()`, `AnalyticsFilters` |
| `thresholds.ts` | Thresholds configuráveis para cores | ~40 | `THRESHOLDS` |

**Total Lib:** ~240 LOC

---

### 5️⃣ **Componentes (src/components/analytics/)**

#### **Filtros (filters/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `GlobalFilters.tsx` | Container de todos os filtros | ~200 | `filters`, `onFiltersChange` |
| `PeriodSelector.tsx` | Seletor de período (mês, 3m, YTD, custom) | ~100 | `value`, `onChange` |
| `ModeToggle.tsx` | Toggle Caixa ↔ Competência | ~60 | `mode`, `onModeChange` |
| `AccountsFilter.tsx` | Multi-select de contas | ~80 | `selected`, `onChange` |
| `CardsFilter.tsx` | Multi-select de cartões | ~80 | `selected`, `onChange` |
| `CategoriesFilter.tsx` | Multi-select de categorias | ~80 | `selected`, `onChange` |

**Subtotal Filtros:** ~600 LOC

#### **KPIs (kpis/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `HealthKpisPanel.tsx` | Container de KPIs | ~150 | `kpis` |
| `SavingsRatioCard.tsx` | Card: Savings Ratio | ~100 | `value`, `mom`, `threshold` |
| `DtiCard.tsx` | Card: DTI | ~100 | `value`, `mom`, `threshold` |
| `EmergencyCard.tsx` | Card: Emergência | ~100 | `months`, `threshold` |
| `RunwayCard.tsx` | Card: Runway | ~100 | `months`, `threshold` |
| `BudgetConsumedCard.tsx` | Card: % Orçamento | ~120 | `consumed`, `budget` |
| `CreditUtilizationCard.tsx` | Card: Utilização de Crédito | ~120 | `used`, `limit` |

**Subtotal KPIs:** ~790 LOC

#### **Flow (flow/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `FlowTrendsPanel.tsx` | Container de Flow | ~100 | `data` |
| `IncomeExpenseChart.tsx` | Linha: Entradas/Saídas/Líquido + MA3 | ~250 | `data`, `onPointClick` |
| `CumulativeChart.tsx` | S-curve: Gasto vs Orçamento | ~200 | `data`, `budget` |

**Subtotal Flow:** ~550 LOC

#### **Categorias (categories/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `CategoriesParetoPanel.tsx` | Container de Categorias | ~100 | `data` |
| `ParetoChart.tsx` | Pareto 80/20 | ~200 | `data`, `onCategoryClick` |
| `BudgetDeviationChart.tsx` | Desvio vs orçamento | ~180 | `data` |

**Subtotal Categorias:** ~480 LOC

#### **Crédito (credit/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `CreditPanel.tsx` | Container de Crédito | ~80 | `data` |
| `InvoiceGauge.tsx` | Gauge: Fatura vs Limite | ~150 | `used`, `limit`, `cardName` |

**Subtotal Crédito:** ~230 LOC

#### **Drill-down (drilldown/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `DrilldownPanel.tsx` | Container | ~100 | `data`, `filters` |
| `DynamicTable.tsx` | Tabela dinâmica | ~300 | `data`, `columns`, `onFilterChange` |

**Subtotal Drill-down:** ~400 LOC

#### **Shared (shared/)**
| Arquivo | Descrição | LOC | Props |
|---------|-----------|-----|-------|
| `ChartWrapper.tsx` | Wrapper para gráficos | ~80 | `isLoading`, `error`, `children` |
| `KpiCard.tsx` | Card genérico para KPIs | ~120 | `label`, `value`, `icon`, `badge` |
| `FilterChips.tsx` | Chips dos filtros aplicados | ~100 | `filters`, `onRemove` |

**Subtotal Shared:** ~300 LOC

**Total Componentes:** ~3350 LOC

---

### 6️⃣ **Página Principal (src/app/(protected)/analytics/)**

| Arquivo | Descrição | LOC | Dependências |
|---------|-----------|-----|--------------|
| `page.tsx` | Página principal de Analytics (reescrever) | ~350 | Todos os componentes acima |

**Total Página:** ~350 LOC

---

## 📊 RESUMO GERAL (Fase 1)

| Categoria | Arquivos | LOC Total |
|-----------|----------|-----------|
| **SQL** | 6 | ~300 |
| **Services** | 5 | ~540 |
| **Hooks** | 6 | ~440 |
| **Lib** | 3 | ~240 |
| **Componentes** | 23 | ~3350 |
| **Página** | 1 | ~350 |
| **TOTAL** | **44** | **~5220** |

---

## 🗺️ MAPA DE QUERIES (Fase 1)

### **Query 1: Health KPIs**
```typescript
// Hook: useKpisData
// Service: getHealthKpis()
// Views: v_kpis_core, v_budget_vs_actual
// Cache Key: ['analytics', 'kpis', userId, mode, from, to]

SELECT
  year_month,
  income_cents,
  expense_cents,
  savings_ratio_pct,
  burn_rate_daily_cents
FROM v_kpis_core
WHERE user_id = $userId
  AND year_month = $currentMonth;

// Complementar com:
// - Reserva (conta específica ou tag)
// - DTI (pagamentos de fatura + empréstimos)
// - Emergência (reserva / avg 3m expense)
// - Runway (ativos líquidos / avg 3m burn)
// - Crédito (fatura aberta / limite)
```

---

### **Query 2: Flow & Tendências**
```typescript
// Hook: useFlowData
// Service: getFlowData()
// Views: v_cash_movements_monthly (Caixa) OU v_charges_monthly (Competência)
// Cache Key: ['analytics', 'flow', userId, mode, from, to]

// MODO CAIXA:
SELECT
  year_month,
  SUM(CASE WHEN type = 'income' THEN total_cents ELSE 0 END) AS income_cents,
  SUM(CASE WHEN type = 'expense' THEN total_cents ELSE 0 END) AS expense_cents
FROM v_cash_movements_monthly
WHERE user_id = $userId
  AND year_month >= $from AND year_month <= $to
GROUP BY year_month
ORDER BY year_month;

// MODO COMPETÊNCIA:
SELECT
  statement_month AS year_month,
  0 AS income_cents, -- Receitas não têm competência
  SUM(charges_total_cents) AS expense_cents
FROM v_charges_monthly
WHERE user_id = $userId
  AND statement_month >= $from AND statement_month <= $to
GROUP BY statement_month
ORDER BY statement_month;

// Pós-processamento no frontend:
// - Média móvel 3 meses (MA3)
// - Outliers (> 2 stddev)
// - S-curve (acumulado vs orçamento)
```

---

### **Query 3: Categorias & Pareto**
```typescript
// Hook: useCategoriesData
// Service: getCategoriesData()
// Views: v_cash_movements_monthly, v_budget_vs_actual
// Cache Key: ['analytics', 'categories', userId, mode, from, to]

// MODO CAIXA:
SELECT
  c.name AS category_name,
  SUM(v.total_cents) AS total_cents,
  COUNT(v.count_tx) AS count_tx
FROM v_cash_movements_monthly v
JOIN categories c ON c.id = v.category_id
WHERE v.user_id = $userId
  AND v.year_month >= $from AND v.year_month <= $to
  AND v.type = 'expense'
GROUP BY c.name
ORDER BY total_cents DESC;

// Complementar com Desvio vs Orçamento:
SELECT
  c.name AS category_name,
  v.budget_cents,
  v.actual_cents,
  v.variance_cents,
  v.variance_pct
FROM v_budget_vs_actual v
JOIN categories c ON c.id = v.category_id
WHERE v.user_id = $userId
  AND v.year_month = $currentMonth
ORDER BY ABS(v.variance_cents) DESC;

// Pós-processamento:
// - Calcular % acumulado (Pareto 80/20)
// - Ordenar por valor decrescente
```

---

### **Query 4: Crédito (Gauge)**
```typescript
// Hook: useCreditData
// Service: getCreditData()
// Views: v_statement_open
// Cache Key: ['analytics', 'credit', userId]

SELECT
  card_id,
  card_name,
  total_charges_cents,
  total_payments_cents,
  open_amount_cents,
  (SELECT limit_cents FROM cards WHERE id = card_id) AS limit_cents
FROM v_statement_open
WHERE user_id = $userId;

// Pós-processamento:
// - Calcular utilização (open / limit * 100)
// - Cores: < 30% verde, 30-60% amarelo, > 60% vermelho
```

---

### **Query 5: Drill-down (Tabela Dinâmica)**
```typescript
// Hook: useDrilldownData
// Service: getDrilldownData()
// Tables: transactions (direto, sem view)
// Cache Key: ['analytics', 'drilldown', userId, mode, from, to, groupBy]

// Agrupamento dinâmico (ex: por categoria + mês)
SELECT
  TO_CHAR(occurred_at, 'YYYY-MM') AS month,
  c.name AS category_name,
  type,
  COUNT(*) AS count_tx,
  SUM(amount_cents) AS total_cents
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.user_id = $userId
  AND t.occurred_at >= $from AND t.occurred_at <= $to
  AND t.type IN ('income', 'expense')
  AND ($mode = 'cash' AND t.card_id IS NULL OR $mode = 'accrual' AND t.card_id IS NOT NULL)
GROUP BY month, c.name, type
ORDER BY month DESC, total_cents DESC;

// Paginação: LIMIT $pageSize OFFSET $offset
```

---

## 🔄 INVALIDAÇÃO DE CACHE

### **Triggers de Invalidação**
```typescript
// src/lib/analytics/cache-invalidation.ts

export function invalidateAnalytics(queryClient: QueryClient, userId: string) {
  // Invalidar TODAS as queries de analytics
  queryClient.invalidateQueries({ queryKey: ['analytics', 'kpis', userId] });
  queryClient.invalidateQueries({ queryKey: ['analytics', 'flow', userId] });
  queryClient.invalidateQueries({ queryKey: ['analytics', 'categories', userId] });
  queryClient.invalidateQueries({ queryKey: ['analytics', 'credit', userId] });
  queryClient.invalidateQueries({ queryKey: ['analytics', 'drilldown', userId] });
}

// Chamar em:
// 1. src/services/transactions.ts → createTransaction()
// 2. src/services/transactions.ts → updateTransaction()
// 3. src/services/transactions.ts → deleteTransaction()
// 4. src/components/carteira/modals/PayInvoiceModal.tsx → onSuccess()
// 5. src/services/budgets.ts → setBudget()
```

---

## 🧪 TESTES DE ACEITAÇÃO (Fase 1)

### **Cenário 1: Toggle Caixa x Competência**
1. Abrir `/analytics`
2. Verificar valores iniciais (modo CAIXA)
3. Clicar em "Toggle Competência"
4. ✅ **Esperado:** 
   - "Total Saídas" diminui (exclui compras de cartão)
   - Gráficos atualizam
   - URL muda para `?mode=accrual`

### **Cenário 2: Pagamento de Fatura**
1. Ir em `/carteiras`
2. Pagar fatura de R$ 100
3. Voltar para `/analytics`
4. ✅ **Esperado:**
   - "Total Saídas" aumenta R$ 100
   - "Fatura Aberta" diminui R$ 100
   - Gráfico de Flow mostra novo ponto

### **Cenário 3: Orçamento**
1. Definir orçamento de R$ 1.000
2. Gastar R$ 600 até dia 15 do mês (30 dias)
3. Abrir `/analytics`
4. ✅ **Esperado:**
   - "% Orçamento Consumido" = 60%
   - S-curve mostra projeção de estouro (run-rate > orçamento)
   - Alerta: "Vai estourar em ~X dias"

### **Cenário 4: Pareto 80/20**
1. Criar transações:
   - Categoria A: R$ 500
   - Categoria B: R$ 300
   - Categoria C: R$ 150
   - Categoria D: R$ 50
2. Abrir `/analytics` → Painel Categorias
3. ✅ **Esperado:**
   - Pareto mostra A + B = 80% (R$ 800 / R$ 1000)
   - Ordenação decrescente
   - Click em A filtra global

### **Cenário 5: Cache**
1. Abrir `/analytics`
2. Mudar filtro para "Últimos 3 meses"
3. Voltar para "Mês Atual"
4. ✅ **Esperado:**
   - Valores atualizados (não congelados)
   - Query executada novamente (verificar Network tab)

### **Cenário 6: Performance**
1. Criar 1.000 transações no mês
2. Abrir `/analytics`
3. ✅ **Esperado:**
   - Respostas < 300ms (verificar Network tab)
   - Views materializadas sendo usadas
   - Gráficos renderizam sem lag

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### **Dia 1-2: Fundação**
1. ✅ Criar views SQL (050-054)
2. ✅ Criar `src/lib/analytics/` (formulas, cache-keys, thresholds)
3. ✅ Criar `src/services/analytics/kpis.ts`
4. ✅ Criar `src/hooks/analytics/useAnalyticsFilters.ts`
5. ✅ Criar `src/components/analytics/shared/` (KpiCard, ChartWrapper)

### **Dia 2-3: Filtros**
6. ✅ Criar `src/components/analytics/filters/GlobalFilters.tsx`
7. ✅ Criar filtros individuais (Period, Mode, Accounts, Cards, Categories)
8. ✅ Integrar com URL state

### **Dia 3-4: KPIs**
9. ✅ Criar `src/hooks/analytics/useKpisData.ts`
10. ✅ Criar `src/components/analytics/kpis/HealthKpisPanel.tsx`
11. ✅ Criar cards individuais (6 cards)

### **Dia 4-5: Flow & Categorias**
12. ✅ Criar `src/services/analytics/flow.ts`
13. ✅ Criar `src/hooks/analytics/useFlowData.ts`
14. ✅ Criar gráficos de Flow (2 gráficos)
15. ✅ Criar gráficos de Categorias (2 gráficos)

### **Dia 5: Crédito & Drill-down**
16. ✅ Criar `src/services/analytics/credit.ts`
17. ✅ Criar `InvoiceGauge.tsx`
18. ✅ Criar `DynamicTable.tsx`

### **Dia 5-6: Integração & Testes**
19. ✅ Reescrever `src/app/(protected)/analytics/page.tsx`
20. ✅ Adicionar invalidação de cache
21. ✅ Rodar testes de aceitação
22. ✅ Build & lint
23. ✅ Deploy

---

## 📚 DEPENDÊNCIAS EXTERNAS

### **Bibliotecas de Gráficos (Escolher 1)**
```json
{
  "dependencies": {
    // Opção 1: Recharts (mais simples, recomendado para MVP)
    "recharts": "^2.10.0",
    
    // OU Opção 2: Chart.js + react-chartjs-2 (mais poderoso)
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    
    // OU Opção 3: Nivo (mais bonito, mais complexo)
    "@nivo/core": "^0.84.0",
    "@nivo/line": "^0.84.0",
    "@nivo/bar": "^0.84.0"
  }
}
```

**Recomendação:** **Recharts** para MVP (Fase 1), migrar para Nivo na Fase 3.

---

## ✅ CHECKLIST FINAL (Antes de Fazer Commit)

### **SQL**
- [ ] Todas as views criadas no Supabase
- [ ] Refresh function testada
- [ ] Índices criados
- [ ] RLS verificado

### **Services**
- [ ] Todas as funções exportadas
- [ ] Erro handling implementado
- [ ] TypeScript types definidos

### **Hooks**
- [ ] React Query configurado
- [ ] Cache keys corretas
- [ ] Loading/Error states tratados

### **Componentes**
- [ ] Props tipadas (TypeScript)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Acessibilidade (ARIA)

### **Página**
- [ ] Todos os painéis renderizando
- [ ] Filtros funcionais
- [ ] URL state sincronizado

### **Testes**
- [ ] 6 cenários de aceitação passando
- [ ] Performance < 300ms
- [ ] Build sem erros (`pnpm build`)
- [ ] Linter sem warnings (`pnpm lint`)

---

**FIM DO PLANO DE IMPLEMENTAÇÃO**

**Status:** ✅ **PRONTO PARA COMEÇAR A CODIFICAR**

**Próximo Comando:** 
```bash
# Criar primeiro arquivo SQL
touch supabase/sql/050_v_cash_movements_monthly.sql
```

