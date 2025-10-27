# 🔍 Diagnóstico 404 - Rotas de Debug

## ❌ PROBLEMA
Rotas dando 404:
- `http://localhost:3000/api/_debug/categories/whoami`
- `http://localhost:3000/api/_debug/categories/insert`

## 🔧 SOLUÇÕES A TENTAR

### **1. Limpar Cache e Reiniciar (MAIS COMUM)**

```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"

# Parar o servidor (Ctrl+C)

# Limpar cache do Next.js
rm -rf .next

# Rodar novamente
npm run dev
```

**Aguarde** aparecer no terminal:
```
✓ Ready in 2.3s
○ Local:   http://localhost:3000
```

Depois teste as rotas.

---

### **2. Verificar se o Servidor Está Rodando**

No terminal, você deve ver algo como:
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000

○ Compiling / ...
✓ Compiled in 1.2s
```

Se **NÃO** vir isso, o servidor não está rodando.

**Iniciar servidor:**
```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"
npm run dev
```

---

### **3. Testar Rota Mais Simples Primeiro**

Vamos criar uma rota de teste ultra simples:

**Criar:** `src/app/api/test/route.ts`

```typescript
export async function GET() {
  return new Response(JSON.stringify({ ok: true, message: "Rota funcionando!" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
```

**Testar:** `http://localhost:3000/api/test`

**Se funcionar:** O problema é específico das rotas de debug
**Se NÃO funcionar:** O problema é com o servidor/projeto

---

### **4. Verificar Estrutura de Arquivos**

No terminal:
```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"

# Ver estrutura completa
tree src/app/api/_debug/categories -L 3
```

**OU**

```bash
ls -R src/app/api/_debug/categories/
```

**Esperado:**
```
src/app/api/_debug/categories/
├── insert/
│   └── route.ts
└── whoami/
    └── route.ts
```

Se não ver isso, os arquivos não estão no lugar certo.

---

### **5. Verificar Conteúdo dos Arquivos**

```bash
# Ver whoami
cat src/app/api/_debug/categories/whoami/route.ts

# Ver insert
cat src/app/api/_debug/categories/insert/route.ts
```

Deve começar com:
```typescript
import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
```

---

### **6. Verificar Logs do Servidor**

Quando você acessa `http://localhost:3000/api/_debug/categories/whoami`, o terminal deve mostrar:

```
GET /api/_debug/categories/whoami 200 in 123ms
```

**OU**

```
GET /api/_debug/categories/whoami 404 in 5ms
```

Se **NÃO** aparecer NADA, o servidor não está recebendo a requisição.

---

### **7. Testar com cURL (Alternativa ao Navegador)**

```bash
# Teste simples
curl http://localhost:3000/api/_debug/categories/whoami

# Com verbose
curl -v http://localhost:3000/api/_debug/categories/whoami
```

**Se retornar HTML com 404:** Rota realmente não existe
**Se retornar JSON:** Rota funcionando!

---

### **8. Verificar package.json**

```bash
cat package.json | grep "\"dev\":"
```

Deve mostrar:
```json
"dev": "next dev",
```

Se for diferente, pode estar rodando o comando errado.

---

### **9. Verificar next.config.ts**

```bash
cat next.config.ts
```

Não deve ter nada que bloqueie as rotas `/api/_debug`:

```typescript
// ❌ NÃO deve ter isso:
async rewrites() {
  return [
    { source: '/api/_debug/:path*', destination: '/404' }
  ]
}
```

---

### **10. Verificar middleware.ts**

```bash
cat middleware.ts | grep -A 5 "matcher"
```

O matcher **NÃO** deve bloquear `/api/_debug`:

```typescript
// ✅ CORRETO - exclui _debug
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|debug|_debug).*)',
  ],
};
```

Se tiver `_debug` no matcher SEM negação `!`, vai dar 404.

---

## 🎯 CHECKLIST DE VERIFICAÇÃO RÁPIDA

Execute estes comandos e me envie a saída:

```bash
cd "/Users/dark_m/Desktop/Dev/Web/NoCry Finance/nocry-finance"

echo "=== 1. Verificar arquivos ==="
ls -la src/app/api/_debug/categories/whoami/
ls -la src/app/api/_debug/categories/insert/

echo "=== 2. Conteúdo whoami ==="
head -5 src/app/api/_debug/categories/whoami/route.ts

echo "=== 3. Verificar processo ==="
ps aux | grep "next dev" | grep -v grep

echo "=== 4. Testar rota ==="
curl -s http://localhost:3000/api/_debug/categories/whoami | head -20
```

---

## 🚀 SOLUÇÃO DEFINITIVA

Se nada funcionar, vamos recriar as rotas do zero em um local diferente:

**Criar:** `src/app/api/debug-test/route.ts`

```typescript
export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({
    ok: true,
    message: "Debug test funcionando!",
    timestamp: new Date().toISOString()
  }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
```

**Testar:** `http://localhost:3000/api/debug-test`

Se isso funcionar, movemos a lógica de whoami/insert para lá.

---

**Execute os comandos do checklist e me envie a saída!**

