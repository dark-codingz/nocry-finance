# 🔐 Instruções - Fix RLS Categories

## 📋 **PROBLEMA**
```
Error: new row violates row-level security policy for table "categories"
```

Esse erro ocorre porque a tabela `categories` tem RLS habilitado mas não possui a coluna `user_id` ou as policies não estão configuradas corretamente.

---

## ✅ **SOLUÇÃO - Passo a Passo**

### **1️⃣ Aplicar Migration no Supabase**

#### Opção A: Via Supabase Dashboard (Recomendado)
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: **NoCry Finance**
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **+ New query**
5. Cole o conteúdo do arquivo: `supabase/sql/040_categories_rls_fix.sql`
6. Clique em **Run** (ou `Ctrl+Enter`)
7. Verifique os logs - deve mostrar:
   ```
   ✅ Coluna user_id adicionada com DEFAULT auth.uid()
   ✅ FK categories_user_id_fkey criada
   ✅ Policy categories_select_own criada
   ✅ Policy categories_insert_own criada
   ✅ Policy categories_update_own criada
   ✅ Policy categories_delete_own criada
   ✅ Trigger trg_categories_set_user_id criado
   
   RLS Habilitado: true
   Policies criadas: 4
   ```

#### Opção B: Via CLI do Supabase (se tiver configurado)
```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"
supabase db push
```

---

### **2️⃣ Verificar Estrutura da Tabela**

Rode esta query no **SQL Editor** para confirmar:

```sql
SELECT
  c.table_schema, c.table_name, c.column_name, c.data_type, c.column_default, c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'categories'
ORDER BY c.ordinal_position;
```

**Esperado:**
| column_name | data_type | column_default | is_nullable |
|-------------|-----------|----------------|-------------|
| id          | uuid      | gen_random_uuid() | NO |
| name        | text      | -              | NO          |
| type        | text      | -              | NO          |
| archived    | boolean   | false          | YES         |
| user_id     | uuid      | **auth.uid()** | **NO**      |
| created_at  | timestamp | now()          | NO          |

---

### **3️⃣ Verificar Policies**

```sql
SELECT polname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'categories';
```

**Esperado:**
| polname | cmd | qual | with_check |
|---------|-----|------|------------|
| categories_select_own | SELECT | (user_id = auth.uid()) | - |
| categories_insert_own | INSERT | - | (user_id = auth.uid()) |
| categories_update_own | UPDATE | (user_id = auth.uid()) | (user_id = auth.uid()) |
| categories_delete_own | DELETE | (user_id = auth.uid()) | - |

---

### **4️⃣ Testar no Código (Local)**

#### A) Testar Criação de Categoria (Via UI)
1. Rode o projeto localmente:
   ```bash
   cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"
   npm run dev
   ```
2. Faça login na aplicação
3. Acesse: `http://localhost:3000/categorias`
4. Tente criar uma nova categoria:
   - Nome: "Teste RLS"
   - Tipo: "Despesa"
5. **Esperado:** Categoria criada com sucesso ✅

#### B) Testar Via Rota de Debug (Recomendado)
1. Rode o projeto: `npm run dev`
2. Faça login
3. Em outra aba/terminal, rode:
   ```bash
   curl -X POST http://localhost:3000/api/_debug/rls/categories \
     -H "Cookie: $(grep sb- ~/.config/Cursor/User/globalStorage/state.vscdb | head -1)"
   ```
   
   **OU** acesse via navegador estando logado:
   - Abra o Console do navegador (F12)
   - Cole e execute:
   ```javascript
   fetch('/api/_debug/rls/categories', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

**Resposta Esperada (Sucesso):**
```json
{
  "ok": true,
  "operation": "complete",
  "test_name": "Teste RLS 1234567890",
  "insert": {
    "success": true,
    "data": {
      "id": "...",
      "name": "Teste RLS 1234567890",
      "user_id": "YOUR_USER_ID"
    },
    "user_id_match": true
  },
  "select": {
    "success": true,
    "data": { ... }
  },
  "summary": {
    "rls_working": true,
    "message": "✅ RLS funcionando corretamente!"
  }
}
```

**Resposta em Caso de Erro:**
```json
{
  "ok": false,
  "operation": "insert",
  "error": "new row violates row-level security policy for table \"categories\"",
  "session": {
    "user_id": "..."
  }
}
```

---

### **5️⃣ Testar em Produção (Vercel)**

#### A) Fazer Deploy
```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"
git add -A
git commit -m "fix: adicionar RLS policies para categories

✅ Migration SQL com:
   - Coluna user_id com DEFAULT auth.uid()
   - FK para auth.users com CASCADE
   - RLS habilitado
   - Policies CRUD para owner
   - Trigger de fallback

✅ Rota de debug: /api/_debug/rls/categories
✅ Código já correto (não envia user_id manualmente)"

git push
```

#### B) Testar na Vercel
1. Aguarde o deploy
2. Acesse: `https://www.theresnocry.com`
3. Faça login
4. Abra o Console (F12) e execute:
   ```javascript
   fetch('/api/_debug/rls/categories', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

5. **Ou** teste criando uma categoria em: `https://www.theresnocry.com/categorias`

---

## 🔍 **DIAGNÓSTICO - Se Ainda Houver Erro**

### Verificar Sessão do Usuário
```javascript
// No Console do navegador (logado)
fetch('/api/_debug/whoami')
  .then(r => r.json())
  .then(console.log)
```

**Esperado:**
```json
{
  "host": "www.theresnocry.com",
  "cookieCount": 3,
  "cookies": [
    { "name": "sb-urqlpzoddfeoxbvnfqgm-auth-token", "length": 500 }
  ]
}
```

### Verificar se user_id está sendo preenchido

Rode no **SQL Editor**:
```sql
-- Ver últimas categorias criadas
SELECT id, name, type, user_id, created_at
FROM public.categories
ORDER BY created_at DESC
LIMIT 10;
```

**Problema:** Se `user_id` estiver NULL
- ✅ Migration não foi aplicada corretamente
- ✅ Usuário não está autenticado (session null)
- ✅ DEFAULT auth.uid() não está funcionando

**Solução:** Re-aplicar migration

---

## 📝 **CÓDIGO - Onde Categories São Criadas**

### Service: `src/services/categories.ts`

```typescript
export async function createCategory(input: {
  name: string;
  type: 'expense' | 'income';
}) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      type: input.type,
      archived: false,
      // ⚠️ NÃO envia user_id - é preenchido por DEFAULT auth.uid() ou trigger
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}
```

✅ **Código está correto!** Não envia `user_id` manualmente.

---

## 🎯 **CHECKLIST**

- [ ] Migration aplicada no Supabase SQL Editor
- [ ] Coluna `user_id` existe com `DEFAULT auth.uid()`
- [ ] FK `categories_user_id_fkey` criada
- [ ] RLS habilitado na tabela
- [ ] 4 policies criadas (select, insert, update, delete)
- [ ] Trigger `trg_categories_set_user_id` criado
- [ ] Teste local passou (rota debug retornou `ok: true`)
- [ ] Deploy para Vercel feito
- [ ] Teste em produção passou
- [ ] Criar categoria manualmente funcionou

---

## 🚨 **EM CASO DE ERRO PERSISTENTE**

1. **Verificar logs do Supabase:**
   - Dashboard > Logs > Postgres Logs
   - Procurar por: `violates row-level security policy`

2. **Desabilitar RLS temporariamente (APENAS PARA DEBUG):**
   ```sql
   ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
   ```
   - Testar se funciona
   - Se funcionar, problema está nas policies
   - **IMPORTANTE:** Re-habilitar depois:
   ```sql
   ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
   ```

3. **Verificar se auth.uid() retorna valor:**
   ```sql
   SELECT auth.uid();
   ```
   - Se retornar NULL, usuário não está autenticado no contexto SQL
   - Verificar se cookies estão sendo enviados corretamente

4. **Deletar e recriar policies:**
   ```sql
   DROP POLICY IF EXISTS categories_select_own ON public.categories;
   DROP POLICY IF EXISTS categories_insert_own ON public.categories;
   DROP POLICY IF EXISTS categories_update_own ON public.categories;
   DROP POLICY IF EXISTS categories_delete_own ON public.categories;
   ```
   - Depois rodar a migration novamente

---

## ✅ **RESULTADO ESPERADO**

Após aplicar todas as correções:

1. ✅ Criar categorias funciona sem erros
2. ✅ Cada usuário vê apenas suas próprias categorias
3. ✅ `user_id` é preenchido automaticamente
4. ✅ RLS impede acesso de outros usuários
5. ✅ Rota de debug retorna `"rls_working": true`

---

**Qualquer dúvida, me avise!** 🚀

