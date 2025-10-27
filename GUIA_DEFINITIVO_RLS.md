# 🎯 GUIA DEFINITIVO - Categories RLS

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **1️⃣ Aplicar Migration SQL (OBRIGATÓRIO)**

**Arquivo:** `supabase/sql/042_categories_rls_final.sql`

#### Como Aplicar:
1. Acesse: [Supabase Dashboard](https://supabase.com/dashboard) → **NoCry Finance**
2. Vá em: **SQL Editor** → **+ New query**
3. Cole o conteúdo completo de: `042_categories_rls_final.sql`
4. Clique em: **Run** (`Ctrl+Enter`)

#### Logs Esperados:
```
✅ Coluna user_id: NOT NULL + DEFAULT auth.uid()
✅ FK categories_user_id_fkey criada/atualizada
✅ RLS habilitado
🗑️  Policy antiga removida: ... (se houver)
✅ 4 policies criadas (SELECT/INSERT/UPDATE/DELETE)
✅ RPC debug_whoami() criada

════════════════════════════════════════════════════
  VERIFICAÇÃO FINAL - CATEGORIES RLS
════════════════════════════════════════════════════
RLS Habilitado: true
Policies ativas: 4
DEFAULT auth.uid(): true
FK para auth.users: true
user_id NOT NULL: true

✅ ✅ ✅  TUDO PERFEITO! Categories RLS 100% OK
════════════════════════════════════════════════════
```

---

### **2️⃣ Verificar Estrutura (Pós-Migration)**

Rode no **SQL Editor**:

```sql
-- Ver colunas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='categories'
ORDER BY ordinal_position;

-- Ver policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname='public' AND tablename='categories'
ORDER BY policyname;

-- Testar RPC whoami
SELECT public.debug_whoami();
```

**Esperado:**
- `user_id` → `uuid`, `NOT NULL`, `DEFAULT auth.uid()`
- 4 policies: `categories_select_own`, `categories_insert_own`, `categories_update_own`, `categories_delete_own`
- `debug_whoami()` → `{ "uid": "...", "role": "authenticated", ... }`

---

### **3️⃣ Testar com Rota de Debug**

```bash
npm run dev
```

**No navegador (F12 Console), estando logado:**

```javascript
// Teste completo (INSERT/SELECT/UPDATE/DELETE)
fetch('/api/_debug/categories/test', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)

// Esperado:
// {
//   final_result: "✅ ✅ ✅  TODOS OS TESTES PASSARAM! RLS funcionando perfeitamente.",
//   summary: {
//     auth: true,
//     whoami: true,
//     insert: true,
//     select: true,
//     update: true,
//     delete: true,
//     user_id_match: true,
//     rls_working: true
//   }
// }
```

**OU teste apenas INSERT:**

```javascript
fetch('/api/_debug/categories/insert', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

---

### **4️⃣ Testar via API Principal**

```javascript
// Criar categoria
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alimentação', type: 'expense' })
})
  .then(r => r.json())
  .then(console.log)

// Esperado:
// {
//   ok: true,
//   data: { id: "...", name: "Alimentação", type: "expense", user_id: "..." },
//   debug: { user_id_match: true, whoami: {...} }
// }
```

```javascript
// Listar categorias
fetch('/api/categories')
  .then(r => r.json())
  .then(console.log)

// Esperado:
// {
//   ok: true,
//   count: 5,
//   categories: [...]
// }
```

---

### **5️⃣ Testar via UI**

1. Acesse: `http://localhost:3000/categorias`
2. Crie categoria: **"Teste Final"** → Tipo **"Despesa"**
3. **Esperado:** ✅ Categoria criada sem erros

---

## 🔍 **DIAGNÓSTICO DE ERROS**

### **Erro: "new row violates row-level security policy"**

#### Causa Possível:
- `auth.uid()` retorna NULL (usuário não autenticado)
- `user_id` enviado do cliente não corresponde a `auth.uid()`

#### Diagnóstico:
```javascript
// 1. Verificar whoami
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Debug', type: 'expense' })
})
  .then(r => r.json())
  .then(data => {
    console.log('whoami:', data.whoami);
    console.log('user_id:', data.user_id);
    console.log('error:', data.error);
  })
```

**Se `whoami.uid` é NULL:**
- ✅ Verificar se `export const runtime = "nodejs"` está na rota
- ✅ Verificar se está usando `createSupabaseServer()` (não browser client)
- ✅ Verificar cookies no navegador (deve ter `sb-*` cookies)
- ✅ Fazer logout e login novamente

**Se `whoami.uid` tem valor mas INSERT falha:**
- ✅ Verificar se a migration rodou com sucesso
- ✅ Verificar policies no Supabase Dashboard
- ✅ Verificar se `type` é válido (`'expense'` ou `'income'`)

---

### **Erro: "column 'type' violates check constraint"**

#### Causa:
- Valor de `type` não corresponde ao CHECK constraint

#### Solução:
```javascript
// Valores válidos (ajuste conforme seu CHECK)
const validTypes = ['expense', 'income'];

// Enviar um valor válido
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    name: 'Teste', 
    type: 'expense' // ✅ usar lowercase
  })
})
```

---

### **Erro: "function debug_whoami() does not exist"**

#### Causa:
- Migration não foi aplicada ou falhou

#### Solução:
1. Rodar migration `042_categories_rls_final.sql` novamente
2. Verificar logs do Supabase

---

## 📊 **ARQUITETURA DO FLUXO**

```
┌─────────────────────────────────────────────┐
│ 1. Cliente (Browser/App)                    │
│    fetch('/api/categories', {               │
│      body: { name: "X", type: "expense" }   │
│    })                                        │
│    ⚠️  NÃO envia user_id                    │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 2. Route Handler (/api/categories)          │
│    export const runtime = "nodejs" ✅       │
│    const supabase = createSupabaseServer()  │
│    const user = await getUser() ✅          │
│    whoami = await rpc("debug_whoami") 🔍    │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 3. Supabase Client (Server-side)            │
│    Headers com JWT token ✅                 │
│    INSERT { name, type, user_id: user.id }  │
│    (ou confiar no DEFAULT)                  │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 4. PostgreSQL + RLS                         │
│    DEFAULT auth.uid() → preenche user_id    │
│    Policy INSERT: WITH CHECK (              │
│      user_id = auth.uid()                   │
│    ) ✅                                      │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 5. Categoria criada! ✅                     │
│    { id, name, type, user_id, ... }         │
└─────────────────────────────────────────────┘
```

---

## 🎯 **CHECKLIST FINAL**

Marque cada item após confirmar:

- [ ] Migration `042_categories_rls_final.sql` aplicada
- [ ] Verificação final mostrou: **"✅ ✅ ✅ TUDO PERFEITO!"**
- [ ] `debug_whoami()` retorna `uid` válido
- [ ] Teste `/api/_debug/categories/test` → `rls_working: true`
- [ ] Teste `/api/categories` POST → `ok: true`
- [ ] Teste `/api/categories` GET → lista categorias
- [ ] Criar categoria na UI `/categorias` → sucesso
- [ ] Deploy para Vercel feito
- [ ] Teste em produção passou

---

## 🚀 **ARQUIVOS CRIADOS**

### **SQL:**
- ✅ `supabase/sql/042_categories_rls_final.sql` - Migration definitiva

### **API:**
- ✅ `src/app/api/categories/route.ts` - POST/GET com debug
- ✅ `src/app/api/_debug/categories/test/route.ts` - Teste completo
- ✅ `src/app/api/_debug/categories/insert/route.ts` - Teste INSERT (já existia)

### **Documentação:**
- ✅ `GUIA_DEFINITIVO_RLS.md` - Este guia

---

## 📝 **LOGS PARA ENVIAR**

Após rodar os testes, me envie:

1. **Logs da migration:**
   ```
   (copiar output do SQL Editor)
   ```

2. **Resultado do teste completo:**
   ```javascript
   fetch('/api/_debug/categories/test', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

3. **Resultado do POST:**
   ```javascript
   fetch('/api/categories', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ name: 'Teste Log', type: 'expense' })
   })
     .then(r => r.json())
     .then(console.log)
   ```

4. **Logs do servidor (terminal onde rodou `npm run dev`):**
   ```
   [POST /api/categories] whoami: {...}
   [POST /api/categories] Body recebido: {...}
   [POST /api/categories] Sucesso: {...}
   ```

---

**Aplique a migration e rode os testes. Me envie os resultados!** 🎉

