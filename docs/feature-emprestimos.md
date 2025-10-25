# Feature: Empréstimos Pessoa-a-Pessoa

## Visão Geral

Sistema completo para gerenciar empréstimos pessoa-a-pessoa com registro detalhado de eventos (dinheiro emprestado, recebido de volta e juros), cálculo automático de saldos e timeline de movimentações.

---

## Conceitos Fundamentais

### Modelo de Eventos

O sistema usa um **modelo baseado em eventos** onde cada movimentação financeira é registrada como um evento:

- **`out` (Emprestei):** Registra quando você empresta dinheiro para alguém
- **`in` (Recebi):** Registra quando você recebe dinheiro de volta
- **`interest` (Juros):** Registra juros acumulados (pode ser positivo ou negativo)

### Cálculo de Saldo

O saldo é calculado automaticamente pela fórmula:

```
balance_cents = out_cents + interest_cents - in_cents
```

**Interpretação:**
- `balance_cents > 0`: A pessoa me deve dinheiro
- `balance_cents < 0`: Eu devo dinheiro para a pessoa
- `balance_cents = 0`: Empréstimo quitado

---

## Arquitetura do Banco de Dados

### Tabela: `loans`

Registro principal do empréstimo/dívida com uma pessoa.

```sql
create table public.loans (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  person text not null,              -- Nome da pessoa
  note text,                          -- Anotações (opcional)
  created_at timestamptz default now()
);
```

**Características:**
- RLS habilitado: `auth.uid() = user_id`
- Índice: `idx_loans_user_id`

---

### Tabela: `loan_events`

Eventos financeiros relacionados aos empréstimos.

```sql
create table public.loan_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  loan_id uuid not null references loans(id) on delete cascade,
  type text check (type in ('out','in','interest')),
  amount_cents bigint check (amount_cents > 0),
  occurred_at date not null,         -- Data do evento (YYYY-MM-DD)
  description text,                  -- Descrição (opcional)
  created_at timestamptz default now()
);
```

**Características:**
- RLS habilitado: `auth.uid() = user_id`
- Cascade: deletar um empréstimo deleta todos os eventos
- Índices:
  - `idx_loan_events_user_id`
  - `idx_loan_events_loan_id_date` (ordenado por data desc)

**Tipos de Evento:**
- `'out'`: Emprestei dinheiro (saída)
- `'in'`: Recebi dinheiro de volta (entrada)
- `'interest'`: Juros acumulados

---

### View: `loan_balances`

View que calcula automaticamente os saldos de cada empréstimo.

```sql
create view loan_balances as
select
  l.id as loan_id,
  l.user_id,
  l.person,
  l.note,
  l.created_at,
  sum(case when e.type = 'out' then e.amount_cents else 0 end) as out_cents,
  sum(case when e.type = 'in' then e.amount_cents else 0 end) as in_cents,
  sum(case when e.type = 'interest' then e.amount_cents else 0 end) as interest_cents,
  (
    sum(case when e.type = 'out' then e.amount_cents else 0 end) +
    sum(case when e.type = 'interest' then e.amount_cents else 0 end) -
    sum(case when e.type = 'in' then e.amount_cents else 0 end)
  ) as balance_cents
from loans l
left join loan_events e on e.loan_id = l.id
group by l.id;
```

**Colunas Retornadas:**
- `loan_id`: ID do empréstimo
- `person`: Nome da pessoa
- `out_cents`: Total emprestado
- `in_cents`: Total recebido de volta
- `interest_cents`: Total de juros
- `balance_cents`: Saldo atual (out + interest - in)

---

## API de Serviços

### `listLoansWithBalance(supabase, userId)`

Lista todos os empréstimos com saldos calculados.

```typescript
const loans = await listLoansWithBalance(supabase, userId);
// Retorna: LoanWithBalance[]
```

**Retorno:**
```typescript
interface LoanWithBalance {
  loanId: string;
  person: string;
  note: string | null;
  balanceCents: number;     // Saldo atual
  outCents: number;         // Total emprestado
  inCents: number;          // Total recebido
  interestCents: number;    // Total de juros
  createdAt: string;
}
```

---

### `createLoan(supabase, userId, params)`

Cria um novo registro de empréstimo.

```typescript
const loan = await createLoan(supabase, userId, {
  person: "João Silva",
  note: "Empréstimo para reforma da casa"  // opcional
});
```

**Parâmetros:**
- `person` (obrigatório): Nome da pessoa
- `note` (opcional): Anotações sobre o empréstimo

**Importante:** Esta função apenas cria o registro. Use `addEvent` para registrar os eventos financeiros.

---

### `addEvent(supabase, userId, params)`

Adiciona um evento financeiro a um empréstimo.

```typescript
// Registrar que emprestei R$ 1.000,00
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'out',
  amountCents: 100000,
  occurredAt: '2025-01-15',
  description: 'Primeira parcela'  // opcional
});

// Registrar que recebi R$ 300,00 de volta
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'in',
  amountCents: 30000,
  occurredAt: '2025-02-15',
  description: 'Pagamento parcial'
});

// Registrar juros de R$ 50,00
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'interest',
  amountCents: 5000,
  occurredAt: '2025-02-28',
  description: 'Juros de 5% ao mês'
});
```

**Parâmetros:**
- `loanId` (obrigatório): ID do empréstimo
- `type` (obrigatório): `'out'` | `'in'` | `'interest'`
- `amountCents` (obrigatório): Valor em centavos (deve ser > 0)
- `occurredAt` (obrigatório): Data no formato YYYY-MM-DD
- `description` (opcional): Descrição do evento

**Validações:**
- `amountCents` deve ser positivo
- `occurredAt` deve estar no formato YYYY-MM-DD
- `type` deve ser um dos três valores válidos

---

### `getLoanTimeline(supabase, userId, loanId)`

Busca a timeline completa de eventos de um empréstimo.

```typescript
const timeline = await getLoanTimeline(supabase, userId, loanId);
// Retorna: LoanEvent[] (ordenado por data, mais recente primeiro)
```

**Retorno:**
```typescript
interface LoanEvent {
  id: string;
  user_id: string;
  loan_id: string;
  type: 'out' | 'in' | 'interest';
  amount_cents: number;
  occurred_at: string;      // YYYY-MM-DD
  description: string | null;
  created_at: string;
}
```

---

### `getLoan(supabase, userId, loanId)`

Busca os detalhes de um empréstimo específico (sem eventos).

```typescript
const loan = await getLoan(supabase, userId, loanId);
// Retorna: Loan | null
```

---

### `updateLoan(supabase, userId, loanId, params)`

Atualiza as informações de um empréstimo (pessoa ou nota).

```typescript
await updateLoan(supabase, userId, loanId, {
  person: "João Silva Junior",
  note: "Atualização da nota"
});
```

**Nota:** Esta função não afeta os eventos já cadastrados.

---

### `deleteLoan(supabase, userId, loanId)`

Deleta um empréstimo e todos os seus eventos (CASCADE).

```typescript
await deleteLoan(supabase, userId, loanId);
```

**⚠️ Atenção:** Ação irreversível! Use com cuidado.

---

## Exemplos de Uso

### Exemplo 1: Empréstimo Simples

```typescript
// 1. Criar o empréstimo
const loan = await createLoan(supabase, userId, {
  person: "Maria Santos",
  note: "Empréstimo pessoal"
});

// 2. Registrar que emprestei R$ 500,00
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'out',
  amountCents: 50000,
  occurredAt: '2025-01-10',
  description: 'Empréstimo inicial'
});

// 3. Registrar que recebi R$ 200,00 de volta
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'in',
  amountCents: 20000,
  occurredAt: '2025-02-10',
  description: 'Primeira parcela'
});

// 4. Verificar o saldo
const loans = await listLoansWithBalance(supabase, userId);
const loanBalance = loans.find(l => l.loanId === loan.id);
console.log(loanBalance.balanceCents); // 30000 (R$ 300,00 restantes)
```

---

### Exemplo 2: Empréstimo com Juros

```typescript
// 1. Criar e registrar empréstimo inicial
const loan = await createLoan(supabase, userId, {
  person: "Carlos Oliveira"
});

await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'out',
  amountCents: 100000,  // R$ 1.000,00
  occurredAt: '2025-01-01'
});

// 2. Registrar juros mensais
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'interest',
  amountCents: 5000,    // R$ 50,00 (5%)
  occurredAt: '2025-01-31',
  description: 'Juros de janeiro'
});

await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'interest',
  amountCents: 5250,    // R$ 52,50 (5% sobre 1050)
  occurredAt: '2025-02-28',
  description: 'Juros de fevereiro'
});

// 3. Receber pagamento
await addEvent(supabase, userId, {
  loanId: loan.id,
  type: 'in',
  amountCents: 110250,  // Pagamento total
  occurredAt: '2025-03-01'
});

// Saldo final: 0 (quitado)
```

---

### Exemplo 3: Visualizar Timeline

```typescript
const timeline = await getLoanTimeline(supabase, userId, loanId);

timeline.forEach(event => {
  const value = formatBRL(event.amount_cents);
  const sign = event.type === 'out' ? '-' : '+';
  console.log(`${event.occurred_at}: ${event.type} ${sign}${value}`);
});

// Saída:
// 2025-02-15: in +R$ 200,00
// 2025-01-10: out -R$ 500,00
```

---

## Segurança (RLS)

Todas as tabelas têm Row Level Security habilitado:

```sql
create policy loans_own on public.loans
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy loan_events_own on public.loan_events
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Garantias:**
- Usuários só veem seus próprios empréstimos
- Usuários só podem criar/editar/deletar seus próprios dados
- Queries automáticas filtradas por `user_id`

---

## Validações

### Nível de Serviço (TypeScript)

- ✅ Autenticação: `userId` obrigatório em todas as funções
- ✅ Nome da pessoa: não pode ser vazio
- ✅ Valor: deve ser positivo (`amountCents > 0`)
- ✅ Data: formato YYYY-MM-DD validado com regex
- ✅ Tipo de evento: apenas `'out'`, `'in'` ou `'interest'`

### Nível de Banco (PostgreSQL)

- ✅ `CHECK (amount_cents > 0)`: valores positivos
- ✅ `CHECK (type in ('out','in','interest'))`: tipos válidos
- ✅ Foreign keys: integridade referencial
- ✅ `ON DELETE CASCADE`: eventos deletados junto com empréstimo

---

## Performance

### Índices Criados

1. **`idx_loans_user_id`**: Otimiza listagem de empréstimos por usuário
2. **`idx_loan_events_user_id`**: Otimiza listagem de eventos por usuário
3. **`idx_loan_events_loan_id_date`**: Otimiza timeline ordenada por data

### View Materializada (Opcional)

Para grandes volumes de dados, considere materializar a view `loan_balances`:

```sql
create materialized view loan_balances_mat as
select * from loan_balances;

create index on loan_balances_mat(user_id);

-- Refresh periódico
refresh materialized view loan_balances_mat;
```

---

## Próximas Melhorias Sugeridas

1. **Histórico de Saldos:** View com saldo acumulado por data
2. **Alertas:** Notificações para pagamentos vencidos
3. **Categorias:** Classificar empréstimos por tipo (pessoal, negócios, etc.)
4. **Recorrência:** Juros automáticos mensais
5. **Parcelas:** Sistema de parcelas fixas com datas programadas
6. **Anexos:** Upload de comprovantes (PDFs, fotos)
7. **Calculadora:** Simulador de juros compostos
8. **Estatísticas:** Dashboard com gráficos de empréstimos ativos/quitados
9. **Export:** Relatório completo em PDF
10. **Multi-moeda:** Suporte a outras moedas além do Real

---

## Testes Recomendados

### 1. Teste Básico
- ✅ Criar empréstimo
- ✅ Adicionar evento 'out'
- ✅ Verificar saldo positivo
- ✅ Adicionar evento 'in'
- ✅ Verificar saldo reduzido

### 2. Teste de Juros
- ✅ Criar empréstimo com 'out'
- ✅ Adicionar múltiplos eventos 'interest'
- ✅ Verificar que `balance_cents = out + interest - in`

### 3. Teste de Timeline
- ✅ Adicionar eventos em datas diferentes
- ✅ Verificar ordenação (mais recente primeiro)

### 4. Teste de RLS
- ✅ Tentar acessar empréstimo de outro usuário (deve falhar)
- ✅ Criar evento para empréstimo de outro usuário (deve falhar)

### 5. Teste de Cascade
- ✅ Deletar empréstimo
- ✅ Verificar que eventos foram deletados automaticamente

---

## Referências

- **Schema SQL:** `supabase/sql/040_loans.sql`
- **Serviço:** `src/services/loans.ts`
- **Convenções Monetárias:** `src/lib/money.ts`




