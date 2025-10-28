# 🔧 SOLUÇÃO - Erro "Usuário não autenticado - user_id é obrigatório"

## 🔴 **PROBLEMA**
```
Error: Usuário não autenticado - user_id é obrigatório
```

**Causa:** O trigger criado na primeira migration estava validando `user_id` e lançando exceção quando `auth.uid()` retornava NULL.

---

## ✅ **SOLUÇÃO**

### **1️⃣ Rodar Nova Migration (SEM TRIGGER)**

A nova migration (`041_categories_rls_simple.sql`):
- ✅ **Remove** o trigger problemático
- ✅ Usa **apenas** `DEFAULT auth.uid()`
- ✅ Confia no código do cliente (que já está correto)

#### **Como Aplicar:**

1. Acesse: [Supabase Dashboard](https://supabase.com/dashboard) → **NoCry Finance**
2. Vá em **SQL Editor** → **+ New query**
3. Cole o conteúdo de: `supabase/sql/041_categories_rls_simple.sql`
4. Clique em **Run** (`Ctrl+Enter`)

**Logs Esperados:**
```
✅ Trigger removido (se existia)
✅ Coluna user_id adicionada (ou já configurada)
✅ DEFAULT auth.uid() adicionado
✅ FK categories_user_id_fkey criada
✅ RLS habilitado
✅ Policy SELECT criada
✅ Policy INSERT criada
✅ Policy UPDATE criada
✅ Policy DELETE criada

════════════════════════════════════════
  VERIFICAÇÃO FINAL - CATEGORIES RLS
════════════════════════════════════════
RLS Habilitado: true
Policies criadas: 4
DEFAULT auth.uid(): true
FK para auth.users: true

✅ TUDO OK! Categories RLS configurado corretamente.
════════════════════════════════════════
```

---

### **2️⃣ Verificar Código (JÁ ESTÁ CORRETO)**

O código em `src/services/categories.ts` **não envia `user_id`**:

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
      // ✅ NÃO envia user_id - DEFAULT auth.uid() preenche
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}
```

✅ **Nenhuma mudança necessária no código!**

---

### **3️⃣ Testar Localmente**

#### A) Via Rota de Debug
```bash
npm run dev
```

**No navegador (logado), abrir Console (F12):**
```javascript
// Testar INSERT
fetch('/api/_debug/categories/insert', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)

// Esperado:
// {
//   ok: true,
//   insert: { success: true, user_id_match: true },
//   summary: { default_working: true, message: "✅ DEFAULT auth.uid() funcionando!" }
// }
```

#### B) Via UI
1. Acesse: `http://localhost:3000/categorias`
2. Crie uma nova categoria:
   - Nome: "Teste"
   - Tipo: "Despesa"
3. **Esperado:** Categoria criada com sucesso ✅

---

### **4️⃣ Testar em Produção (Vercel)**

Após o deploy:

```javascript
// Console em https://www.theresnocry.com (logado)
fetch('/api/_debug/categories/insert', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

---

## 🔍 **DIAGNÓSTICO - Se Ainda Houver Erro**

### **Erro: "new row violates row-level security policy"**

**Causa:** RLS está bloqueando porque `user_id` não corresponde a `auth.uid()`

**Solução:**
1. Verificar se a migration rodou com sucesso
2. Verificar se o usuário está realmente logado:
   ```javascript
   fetch('/api/_debug/whoami')
     .then(r => r.json())
     .then(console.log)
   ```
3. Verificar policies no Supabase Dashboard → **Authentication** → **Policies**

### **Erro: "column 'user_id' is of type uuid but expression is of type text"**

**Causa:** Enviando `user_id` como string

**Solução:**
- Verificar se o código não está enviando `user_id` manualmente
- O `DEFAULT auth.uid()` já é do tipo `uuid`

### **Erro: "auth.uid() returned NULL"**

**Causa:** Usuário não está autenticado (sessão expirou)

**Solução:**
1. Fazer logout e login novamente
2. Verificar cookies no navegador (F12 → Application → Cookies)
3. Deve ter cookies começando com `sb-`

---

## 📊 **COMO FUNCIONA AGORA**

### **Fluxo de Criação de Categoria:**

```
1. Cliente envia: { name: "Alimentação", type: "expense" }
   ↓
2. Service não adiciona user_id (código já está correto)
   ↓
3. Supabase recebe INSERT sem user_id
   ↓
4. DEFAULT auth.uid() preenche user_id automaticamente
   ↓
5. Policy INSERT verifica: user_id == auth.uid() ✅
   ↓
6. Categoria criada com sucesso!
```

### **Proteção RLS:**

- ✅ Cada usuário vê **apenas suas categorias**
- ✅ Não pode criar categorias para outros usuários
- ✅ Não pode editar/deletar categorias de outros
- ✅ `user_id` é preenchido automaticamente e validado

---

## 🎯 **CHECKLIST DE SOLUÇÃO**

- [ ] Migration `041_categories_rls_simple.sql` aplicada
- [ ] Trigger antigo removido
- [ ] DEFAULT auth.uid() configurado
- [ ] RLS habilitado com 4 policies
- [ ] FK para auth.users criada
- [ ] Teste local passou (rota debug retornou `ok: true`)
- [ ] Teste na UI funcionou (criar categoria manualmente)
- [ ] Deploy para Vercel feito
- [ ] Teste em produção passou

---

## 📝 **RESUMO DAS MUDANÇAS**

### **Antes (❌ Problemático):**
```sql
-- Trigger que lançava exceção
CREATE TRIGGER trg_categories_set_user_id
  BEFORE INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION set_row_user_id();

-- Função que validava user_id
CREATE FUNCTION set_row_user_id() AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Usuário não autenticado - user_id é obrigatório'; -- ❌
    END IF;
  END IF;
  RETURN NEW;
END; $$;
```

### **Agora (✅ Funcional):**
```sql
-- SEM trigger - apenas DEFAULT
ALTER TABLE categories 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- RLS valida via policies
CREATE POLICY "categories_insert_own"
  ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid()); -- ✅ Validação correta
```

---

## 🚀 **RESULTADO FINAL**

Após aplicar a nova migration:

1. ✅ **Criar categorias funciona** (UI e API)
2. ✅ `user_id` preenchido automaticamente
3. ✅ RLS protege acesso cruzado
4. ✅ Sem erros de validação
5. ✅ Código do cliente não precisa mudar

---

**Aplique a migration `041_categories_rls_simple.sql` e teste!** 🎉


