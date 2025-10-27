# 🧪 GUIA DE TESTE - RLS Categories

## 🎯 **OBJETIVO**

Testar o RLS de categories diretamente no navegador (sem Console/fetch), verificando:
1. Se o token JWT chega ao servidor
2. Se `auth.uid()` retorna valor válido
3. Se INSERT funciona com DEFAULT
4. Se RLS permite a operação

---

## ⚙️ **PRÉ-REQUISITOS**

### **1. Migration Aplicada**
- ✅ Rode `042_categories_rls_final.sql` no Supabase SQL Editor
- ✅ Verifique logs: "✅ ✅ ✅ TUDO PERFEITO! Categories RLS 100% OK"

### **2. Rotas de Debug Criadas**
- ✅ `src/app/api/_debug/categories/whoami/route.ts`
- ✅ `src/app/api/_debug/categories/insert/route.ts`

### **3. Projeto Rodando**
```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"
npm run dev
```

---

## 🧹 **LIMPAR COOKIES INVÁLIDOS (SE NECESSÁRIO)**

### **Sintoma:**
- Erro: "Failed to parse cookie string"
- Erro: "Invalid JWT"
- Rota retorna: `whoami: null` ou `user: null`

### **Solução:**

#### **Opção A: DevTools (Recomendado)**
1. Abra DevTools (`F12`)
2. Vá em: **Application** → **Storage** → **Cookies**
3. Selecione: `http://localhost:3000` (ou `https://www.theresnocry.com`)
4. **Delete** todos os cookies que começam com `sb-`
   - `sb-urqlpzoddfeoxbvnfqgm-auth-token`
   - `sb-urqlpzoddfeoxbvnfqgm-auth-token-code-verifier`
   - Qualquer outro `sb-*`
5. **Refresh** a página
6. Faça **login novamente**

#### **Opção B: Janela Anônima**
1. Abra uma **janela anônima** (`Ctrl+Shift+N` ou `Cmd+Shift+N`)
2. Acesse: `http://localhost:3000/login`
3. Faça login
4. Teste as rotas de debug

#### **Opção C: Limpar Storage Completo**
1. DevTools → **Application** → **Storage**
2. Botão direito em `http://localhost:3000`
3. **Clear site data**
4. Refresh e faça login novamente

---

## 🧪 **TESTES - PASSO A PASSO**

### **TESTE 1: Whoami (Verificar Token)**

#### **Local:**
```
http://localhost:3000/api/_debug/categories/whoami
```

#### **Vercel (Produção):**
```
https://www.theresnocry.com/api/_debug/categories/whoami
```

#### **Como Testar:**
1. **Faça login** no site
2. **Abra uma nova aba** e cole o link acima
3. Ou clique no link diretamente (estando logado)

#### **Resultado Esperado (✅ SUCESSO):**
```json
{
  "whoami": {
    "uid": "abc-123-def-456...",
    "role": "authenticated",
    "jwt_sub": "abc-123-def-456...",
    "jwt_role": "authenticated"
  },
  "getUserErr": null,
  "user": {
    "id": "abc-123-def-456...",
    "email": "seu-email@example.com",
    "aud": "authenticated",
    ...
  }
}
```

**✅ Tudo OK se:**
- `whoami.uid` tem valor (não é `null`)
- `user.id` tem valor e é igual a `whoami.uid`
- `getUserErr` é `null`

#### **Resultado com Erro (❌ PROBLEMA):**
```json
{
  "whoami": null,
  "getUserErr": "JWT expired" ou "Invalid JWT",
  "user": null
}
```

**Causa:** Cookie inválido ou expirado
**Solução:** Limpar cookies (ver seção acima)

---

### **TESTE 2: Insert (Criar Categoria)**

#### **Local:**
```
http://localhost:3000/api/_debug/categories/insert?name=Mercado&type=expense
```

#### **Vercel (Produção):**
```
https://www.theresnocry.com/api/_debug/categories/insert?name=Mercado&type=expense
```

#### **Como Testar:**
1. **Faça login** no site
2. **Abra uma nova aba** e cole o link acima
3. Ou clique no link diretamente (estando logado)

#### **Resultado Esperado (✅ SUCESSO):**
```json
{
  "ok": true,
  "whoami": {
    "uid": "abc-123-def-456...",
    "role": "authenticated"
  },
  "user": {
    "id": "abc-123-def-456...",
    "email": "seu-email@example.com",
    ...
  },
  "sent": {
    "name": "Mercado",
    "type": "expense"
  },
  "data": {
    "id": "xyz-789...",
    "name": "Mercado",
    "type": "expense",
    "user_id": "abc-123-def-456..."
  },
  "error": null
}
```

**✅ Tudo OK se:**
- `ok: true`
- `data.id` tem valor (categoria criada)
- `data.user_id` == `user.id` (ownership correto)
- `error` é `null`

#### **Resultado com Erro (❌ PROBLEMA):**

**Erro 1: Não autenticado**
```json
{
  "ok": false,
  "step": "auth",
  "whoami": null,
  "error": "Não autenticado"
}
```
**Causa:** Cookie inválido/ausente
**Solução:** Limpar cookies e fazer login

**Erro 2: RLS Policy**
```json
{
  "ok": false,
  "whoami": { "uid": "abc-123..." },
  "user": { "id": "abc-123..." },
  "error": "new row violates row-level security policy for table \"categories\""
}
```
**Causa:** Migration não foi aplicada ou policies incorretas
**Solução:** 
1. Aplicar migration `042_categories_rls_final.sql`
2. Verificar policies no Supabase Dashboard

**Erro 3: Type inválido**
```json
{
  "ok": false,
  "error": "new row for relation \"categories\" violates check constraint \"categories_type_check\""
}
```
**Causa:** Valor de `type` não é válido
**Solução:** Usar `type=expense` ou `type=income` (lowercase)

---

## 🔍 **DIAGNÓSTICO RÁPIDO**

### **whoami.uid é NULL:**
- ❌ Token JWT não chegou ao servidor
- ❌ Cookie inválido ou ausente
- ✅ **Solução:** Limpar cookies e fazer login

### **getUser retorna NULL mas whoami tem uid:**
- ❌ Problema na validação do token no servidor
- ✅ **Solução:** Verificar `runtime = "nodejs"` nas rotas

### **INSERT retorna 400 com RLS error:**
- ❌ Migration não aplicada
- ❌ Policies não criadas
- ✅ **Solução:** Rodar migration novamente

### **INSERT retorna 201 mas data.user_id ≠ user.id:**
- ❌ DEFAULT auth.uid() não está funcionando
- ❌ RLS policy não validou corretamente
- ✅ **Solução:** Verificar policies e DEFAULT

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

Marque cada item após confirmar:

### **Antes dos Testes:**
- [ ] Migration `042_categories_rls_final.sql` aplicada
- [ ] Verificação final: "✅ ✅ ✅ TUDO PERFEITO!"
- [ ] Rotas `/api/_debug/categories/whoami` e `/insert` existem
- [ ] `npm run dev` rodando (local) ou deploy feito (Vercel)
- [ ] Cookies limpos (se necessário)
- [ ] Login feito com sucesso

### **Resultados dos Testes:**
- [ ] Whoami retorna `uid` e `user` válidos
- [ ] `whoami.uid` == `user.id`
- [ ] Insert retorna `ok: true`
- [ ] `data.user_id` == `user.id`
- [ ] Categoria criada no Supabase Dashboard

---

## 🚀 **TESTE EM PRODUÇÃO (VERCEL)**

Após confirmar que funciona localmente:

1. **Commit e push:**
   ```bash
   git add -A
   git commit -m "test: rotas de debug RLS funcionando"
   git push
   ```

2. **Aguardar deploy** no Vercel

3. **Testar em produção:**
   - Fazer login em: `https://www.theresnocry.com/login`
   - Abrir aba nova: `https://www.theresnocry.com/api/_debug/categories/whoami`
   - Abrir aba nova: `https://www.theresnocry.com/api/_debug/categories/insert?name=TesteProd&type=expense`

4. **Verificar logs:**
   - Vercel Dashboard → Logs → Function Logs
   - Procurar por: `[POST /api/categories]` ou erros

---

## 📊 **FORMATO DOS LOGS PARA ENVIAR**

Se houver erro, me envie:

### **1. Resultado do Whoami:**
```json
(copiar JSON completo do navegador)
```

### **2. Resultado do Insert:**
```json
(copiar JSON completo do navegador)
```

### **3. Screenshot dos Cookies:**
- DevTools → Application → Cookies → localhost:3000
- Mostrar todos os cookies `sb-*`

### **4. Query SQL (se RLS error):**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname='public' AND tablename='categories'
ORDER BY policyname;
```

---

## ✅ **RESULTADO FINAL ESPERADO**

Após todos os testes:

1. ✅ **Whoami:** `uid` e `user` válidos
2. ✅ **Insert:** Categoria criada com `user_id` correto
3. ✅ **RLS:** Policies funcionando
4. ✅ **DEFAULT:** `auth.uid()` preenchendo automaticamente
5. ✅ **Produção:** Tudo funcionando no Vercel

---

**Rode os testes e me envie os resultados!** 🎉

