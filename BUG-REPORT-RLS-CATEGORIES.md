# 🐛 BUG REPORT: RLS Categories - "new row violates row-level security policy"

**Data:** 27 de Outubro de 2025  
**Severidade:** 🔴 CRÍTICA (bloqueava criação de categorias)  
**Status:** ✅ RESOLVIDO

---

## 📋 SINTOMAS

### Erro no Frontend:
```
new row violates row-level security policy for table "categories"
```

### Contexto:
- ✅ Rota de debug (`/api/debug-insert`) funcionava perfeitamente
- ❌ Interface real (`/categorias`) falhava ao criar categoria
- ✅ Usuário estava autenticado
- ✅ SQL migration aplicada com sucesso
- ✅ RLS policies configuradas corretamente
- ✅ DEFAULT auth.uid() funcionando no debug

---

## 🔍 CAUSA RAIZ

### O Problema:
O serviço `src/services/categories.ts` estava usando o **cliente Supabase ANTIGO**:

```typescript
// ❌ CÓDIGO PROBLEMÁTICO
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createCategory(input: { name: string; type: string }) {
  const supabase = createClientComponentClient(); // ❌ Cliente antigo!
  
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name, type: input.type })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Por Que Falhava:

1. **Cliente Desatualizado:**
   - `@supabase/auth-helpers-nextjs` é uma lib **DEPRECATED**
   - Não envia cookies de autenticação corretamente no App Router do Next.js 15+
   - Não usa o padrão `@supabase/ssr` moderno

2. **Sessão Não Enviada:**
   - O cliente antigo não conseguia ler os cookies `sb-*-auth-token`
   - Supabase recebia a request **SEM TOKEN JWT**
   - `auth.uid()` retornava `NULL`
   - `DEFAULT auth.uid()` no SQL falhava
   - RLS policy bloqueava: `WITH CHECK (user_id = auth.uid())` → `NULL = NULL` → ❌ FALSE

3. **Inconsistência:**
   - **Debug route** (`/api/debug-insert`): Usava `createServerClient` com `cookies()` → ✅ Funcionava
   - **Frontend** (`/categorias`): Usava `createClientComponentClient` → ❌ Falhava

---

## ✅ SOLUÇÃO

### 1. Migração para Cliente Moderno

Substituir o import antigo:

```typescript
// ❌ ANTES
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ✅ DEPOIS
import { createSupabaseBrowser } from '@/lib/supabase/client';
```

### 2. Atualizar Todas as Funções

```typescript
// ✅ CÓDIGO CORRIGIDO
import { createSupabaseBrowser } from '@/lib/supabase/client';

export async function createCategory(input: { name: string; type: string }) {
  const supabase = createSupabaseBrowser(); // ✅ Cliente novo!
  
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name, type: input.type }) // DEFAULT auth.uid() agora funciona!
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### 3. Configuração do Cliente Novo (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Por que funciona:**
- ✅ `@supabase/ssr` é a lib **OFICIAL** para Next.js App Router
- ✅ Lê cookies automaticamente via `document.cookie` no browser
- ✅ Persiste sessão corretamente
- ✅ Envia JWT em todas as requests
- ✅ `auth.uid()` retorna o ID correto
- ✅ RLS policies funcionam

---

## 🎯 FUNÇÕES CORRIGIDAS

### Arquivo: `src/services/categories.ts`

| Função | Linha | Status |
|--------|-------|--------|
| `listCategories()` | 32 | ✅ Corrigido |
| `createCategory()` | 65 | ✅ Corrigido |
| `updateCategory()` | 88 | ✅ Corrigido |
| `archiveCategory()` | 108 | ✅ Corrigido |

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ANTES (Cliente Antigo):
```
┌─────────────┐     ❌ SEM JWT     ┌──────────┐
│   Browser   │ ─────────────────> │ Supabase │
│ (categorias)│                    │          │
└─────────────┘                    └──────────┘
                                        │
                                        ▼
                              auth.uid() = NULL
                                        │
                                        ▼
                              RLS Policy NEGA
                                        │
                                        ▼
                              ❌ ERRO 400
```

### DEPOIS (Cliente Novo):
```
┌─────────────┐     ✅ COM JWT     ┌──────────┐
│   Browser   │ ─────────────────> │ Supabase │
│ (categorias)│   (via cookies)    │          │
└─────────────┘                    └──────────┘
                                        │
                                        ▼
                            auth.uid() = USER_ID
                                        │
                                        ▼
                              DEFAULT preenche
                                        │
                                        ▼
                           RLS Policy PERMITE
                                        │
                                        ▼
                              ✅ SUCESSO 201
```

---

## 🧪 TESTE DE VALIDAÇÃO

### Passos:
1. ✅ Acessar `/categorias` logado
2. ✅ Preencher formulário: "Mercado" / Tipo: Despesa
3. ✅ Clicar em "Adicionar Despesa"
4. ✅ Categoria criada com sucesso
5. ✅ Aparece na lista
6. ✅ `user_id` preenchido automaticamente via `DEFAULT auth.uid()`

### Logs no Console:
```json
{
  "id": "uuid-da-categoria",
  "name": "Mercado",
  "type": "expense",
  "user_id": "uuid-do-usuario",
  "archived": false,
  "created_at": "2025-10-27T..."
}
```

---

## 📚 LIÇÕES APRENDIDAS

### 1. Cliente Supabase Correto por Contexto:

| Contexto | Cliente | Lib |
|----------|---------|-----|
| **Browser (Client Component)** | `createSupabaseBrowser()` | `@supabase/ssr` |
| **Server (Route Handler)** | `createServerClient()` | `@supabase/ssr` |
| **Server (Server Component)** | `createSupabaseServer()` | `@supabase/ssr` |
| **Middleware** | `createServerClient()` | `@supabase/ssr` |

### 2. Sempre Usar `@supabase/ssr`:
- ❌ **NUNCA** usar `@supabase/auth-helpers-nextjs` (deprecated)
- ✅ **SEMPRE** usar `@supabase/ssr` para Next.js 13+

### 3. Debug Eficiente:
- ✅ Criar rotas de debug (`/api/debug-*`) para isolar problemas
- ✅ Comparar comportamento: debug vs. UI real
- ✅ Se debug funciona e UI falha → problema no cliente

### 4. RLS Debugging:
```sql
-- RPC para debug de autenticação
CREATE OR REPLACE FUNCTION debug_whoami()
RETURNS json AS $$
  SELECT json_build_object(
    'uid', auth.uid(),
    'role', current_user,
    'jwt_sub', current_setting('request.jwt.claim.sub', true)
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 🚨 OUTROS SERVIÇOS A REVISAR

Os seguintes arquivos **AINDA USAM O CLIENTE ANTIGO** e devem ser migrados:

```
✅ src/services/categories.ts (CORRIGIDO)
⚠️  src/services/loans.ts
⚠️  src/services/wallet.ts
⚠️  src/services/transactions.ts
⚠️  src/services/profile.ts
⚠️  src/services/fixed.ts
⚠️  src/services/finance.ts
⚠️  src/services/cards.ts
⚠️  src/services/budgets.ts
⚠️  src/services/analytics.ts
⚠️  src/services/accounts.ts
⚠️  src/components/carteira/forms/TxForm.tsx
⚠️  src/hooks/finance/transactions.ts
⚠️  src/hooks/finance/sdm.ts
⚠️  src/hooks/finance/lookups.ts
```

**AÇÃO RECOMENDADA:** Migrar todos em batch para evitar bugs similares.

---

## 🔗 COMMITS RELACIONADOS

1. **`bb1570e`** - fix: completar migração do categories service para createSupabaseBrowser
2. **`ccac13d`** - fix: atualizar categories service para usar createSupabaseBrowser  
3. **`6988fed`** - fix: renomear variável URL para SUPABASE_URL (conflito com construtor global)

---

## 📖 REFERÊNCIAS

- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [@supabase/ssr Package](https://github.com/supabase/auth-helpers/tree/main/packages/ssr)

---

**FIM DO RELATÓRIO**


