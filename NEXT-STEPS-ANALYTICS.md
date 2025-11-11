# 🚀 Próximos Passos - Analytics (68% Restante)

**Status Atual:** 32% concluído (14/44 arquivos)  
**Commit:** `3a4447c8`

---

## ✅ JÁ IMPLEMENTADO (14 arquivos)

- ✅ SQL Views (6) - Materialized views + refresh function
- ✅ Lib (3) - Formulas, cache-keys, thresholds
- ✅ Services (5) - kpis, flow, categories, credit, drilldown

---

## 📋 PENDENTE (30 arquivos)

### **1. HOOKS (6 arquivos, ~440 LOC) - PRÓXIMO**

Criar em `src/hooks/analytics/`:

#### `useAnalyticsFilters.ts` (~100 LOC)
```typescript
// Hook para gerenciar filtros globais (URL state)
export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: user } = useUser();
  
  const filters = deserializeFilters(searchParams, user.id, getDefaultFilters(user.id));
  
  const setFilters = (newFilters: Partial<AnalyticsFilters>) => {
    const updated = { ...filters, ...newFilters };
    const params = serializeFilters(updated);
    router.push(`/analytics?${params.toString()}`);
  };
  
  return { filters, setFilters };
}
```

#### `useKpisData.ts` (~80 LOC)
```typescript
export function useKpisData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('kpis', filters),
    queryFn: () => getHealthKpis(filters),
    staleTime: 1000 * 60 * 5, // 5 min
    enabled: !!filters.userId,
  });
}
```

#### `useFlowData.ts` (~70 LOC)
```typescript
export function useFlowData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('flow', filters),
    queryFn: () => getFlowData(filters),
    staleTime: 1000 * 60 * 5,
    enabled: !!filters.userId,
  });
}
```

#### `useCategoriesData.ts` (~70 LOC)
```typescript
export function useCategoriesData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('categories', filters),
    queryFn: () => getCategoriesData(filters),
    staleTime: 1000 * 60 * 5,
    enabled: !!filters.userId,
  });
}
```

#### `useCreditData.ts` (~60 LOC)
```typescript
export function useCreditData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: getCacheKey('credit', filters),
    queryFn: () => getCreditData(filters),
    staleTime: 1000 * 60 * 5,
    enabled: !!filters.userId,
  });
}
```

#### `useDrilldownData.ts` (~60 LOC)
```typescript
export function useDrilldownData(params: DrilldownParams) {
  return useQuery({
    queryKey: getCacheKey('drilldown', params.filters),
    queryFn: () => getDrilldownData(params),
    staleTime: 1000 * 60 * 2,
    enabled: !!params.filters.userId,
  });
}
```

---

### **2. COMPONENTES SHARED (3 arquivos, ~300 LOC)**

#### `components/analytics/shared/KpiCard.tsx`
- Props: label, value, icon, badge, mom, onClick
- Layout: Glass card com hover effect
- Badge colorido (success/warning/danger)

#### `components/analytics/shared/ChartWrapper.tsx`
- Props: isLoading, error, children, title
- Loading skeleton
- Error fallback
- Empty state

#### `components/analytics/shared/FilterChips.tsx`
- Props: filters, onRemove
- Chips com X para remover
- Ex: "Janeiro 2025 ×", "Alimentação ×"

---

### **3. FILTROS (6 arquivos, ~600 LOC)**

#### `components/analytics/filters/GlobalFilters.tsx`
- Container de todos os filtros
- Layout horizontal (desktop) ou vertical (mobile)

#### `components/analytics/filters/ModeToggle.tsx`
- Toggle Caixa ↔ Competência
- Botão com ícone (💰 vs 📅)

#### `components/analytics/filters/PeriodSelector.tsx`
- Dropdown: Mês Atual, Últimos 3M, YTD, Custom
- DatePicker se custom

#### `components/analytics/filters/AccountsFilter.tsx`
- Multi-select de contas
- Usar shadcn/ui Combobox

#### `components/analytics/filters/CardsFilter.tsx`
- Multi-select de cartões

#### `components/analytics/filters/CategoriesFilter.tsx`
- Multi-select de categorias
- Com busca

---

### **4. KPIS (7 arquivos, ~790 LOC)**

Todos seguem o mesmo padrão:
- Usar `<KpiCard>`
- Props: value, mom, badge
- Formatação específica (%, meses, R$)

Arquivos:
- `HealthKpisPanel.tsx` - Container em grid
- `SavingsRatioCard.tsx`
- `DtiCard.tsx`
- `EmergencyCard.tsx`
- `RunwayCard.tsx`
- `BudgetConsumedCard.tsx`
- `CreditUtilizationCard.tsx`

---

### **5. FLOW (3 arquivos, ~550 LOC)**

#### `FlowTrendsPanel.tsx`
- Container

#### `IncomeExpenseChart.tsx`
- Recharts LineChart
- 3 linhas: Income, Expense, Net
- Linha tracejada: MA3
- onClick → filtra drill-down

#### `CumulativeChart.tsx`
- Recharts LineChart
- S-curve: Gasto acumulado vs Orçamento linear
- Área de risco (quando acumulado > orçamento ideal)

---

### **6. CATEGORIAS (3 arquivos, ~480 LOC)**

#### `CategoriesParetoPanel.tsx`
- Container

#### `ParetoChart.tsx`
- Recharts BarChart (horizontal)
- Barras: Valor por categoria
- Linha: % acumulado
- Marca de 80% (linha vertical)

#### `BudgetDeviationChart.tsx`
- Recharts BarChart (divergente)
- Verde: Economia (variance < 0)
- Vermelho: Estouro (variance > 0)

---

### **7. CRÉDITO (2 arquivos, ~230 LOC)**

#### `CreditPanel.tsx`
- Container

#### `InvoiceGauge.tsx`
- Recharts PieChart ou RadialBarChart
- Gauge: usado / limite
- Cores: verde/amarelo/vermelho (thresholds)

---

### **8. DRILL-DOWN (2 arquivos, ~400 LOC)**

#### `DrilldownPanel.tsx`
- Container
- Filtros: GroupBy, OrderBy

#### `DynamicTable.tsx`
- Tabela com sorting
- Paginação
- Click na linha → detalhe
- Export CSV (futuro)

---

### **9. PÁGINA (1 arquivo, ~350 LOC)**

#### `app/(protected)/analytics/page.tsx`

```typescript
export default function AnalyticsPage() {
  const { filters, setFilters } = useAnalyticsFilters();
  
  // Data fetching
  const { data: kpis, isLoading: kpisLoading } = useKpisData(filters);
  const { data: flow } = useFlowData(filters);
  const { data: categories } = useCategoriesData(filters);
  const { data: credit } = useCreditData(filters);
  
  return (
    <div className="px-6 pt-5 pb-10">
      <h1>Analytics</h1>
      
      <GlobalFilters filters={filters} onFiltersChange={setFilters} />
      
      <HealthKpisPanel kpis={kpis} />
      <FlowTrendsPanel data={flow} />
      <CategoriesParetoPanel data={categories} />
      <CreditPanel data={credit} />
      <DrilldownPanel filters={filters} />
    </div>
  );
}
```

---

### **10. INVALIDAÇÃO DE CACHE**

Adicionar em:

#### `src/services/transactions.ts`
```typescript
import { invalidateAnalytics } from '@/lib/analytics/cache-invalidation';

export async function createTransaction(...) {
  // ... código existente
  
  // Invalidar analytics
  invalidateAnalytics(queryClient, userId);
}
```

#### `src/components/carteira/modals/PayInvoiceModal.tsx`
```typescript
// Após sucesso do pagamento
invalidateAnalytics(queryClient, userId);
```

#### `src/services/budgets.ts`
```typescript
// Após setBudget
invalidateAnalytics(queryClient, userId);
```

---

## 🔧 DEPENDÊNCIAS A INSTALAR

```bash
cd nocry-finance
pnpm add recharts
```

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. ✅ ~~SQL + Lib + Services~~ (CONCLUÍDO)
2. **Hooks** (6 arquivos) - 1-2 horas
3. **Shared Components** (3 arquivos) - 1 hora
4. **Filtros** (6 arquivos) - 2 horas
5. **KPIs** (7 arquivos) - 2-3 horas
6. **Flow** (3 arquivos) - 2 horas
7. **Categorias** (3 arquivos) - 2 horas
8. **Crédito** (2 arquivos) - 1 hora
9. **Drill-down** (2 arquivos) - 2 horas
10. **Página** (1 arquivo) - 1 hora
11. **Invalidação** - 30 min
12. **Testes** - 2 horas
13. **Build & Deploy** - 1 hora

**Total estimado:** ~20 horas (2-3 dias de trabalho focado)

---

## 📚 RECURSOS

- **Recharts Docs:** https://recharts.org/en-US/
- **shadcn/ui:** https://ui.shadcn.com/ (Combobox, DatePicker)
- **React Query:** https://tanstack.com/query/latest

---

## 🚀 COMANDO PARA CONTINUAR

Para continuar a implementação na próxima sessão:

```
"Continuar implementação do Analytics - Criar hooks (Parte 3/6)"
```

Ou solicitar arquivo por arquivo:

```
"Criar hooks/analytics/useAnalyticsFilters.ts"
```

---

**Última atualização:** 2025-01-11 (Commit `3a4447c8`)  
**Progresso:** 32% concluído (14/44 arquivos)

