# Documentação Técnica - NoCry Finance

<!--
NOTA DE USO:
Este documento é a fonte central de verdade sobre a arquitetura, configuração e
funcionalidades do projeto. Deve ser consultado por novos desenvolvedores e
atualizado sempre que houver mudanças estruturais na aplicação.
-->

---

## 1. Configuração do Ambiente Local

Para rodar o projeto em sua máquina local, siga os passos abaixo.

### Pré-requisitos
- Node.js (v18 ou superior)
- npm

### Passos para Instalação

1.  **Clonar o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd nocry-finance
    ```

2.  **Instalar dependências:**
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente:**
    - Crie uma cópia do arquivo `.env.example` e renomeie para `.env.local`.
      ```bash
      cp .env.example .env.local
      ```
    - Preencha as variáveis em `.env.local` com suas chaves do projeto Supabase. Você pode encontrá-las em *Project Settings > API*.
      ```ini
      NEXT_PUBLIC_SUPABASE_URL=SUA_URL_DO_PROJETO_SUPABASE
      NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_DO_PROJETO
      
      # Deixe como "true" para habilitar a página de seeding de dados (/dev/seed)
      NEXT_PUBLIC_DEV_TOOLS="true"
      ```
      > **Importante:** O arquivo `.env.local` não deve ser versionado no Git por questões de segurança.

4.  **Rodar o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    - A aplicação estará disponível em `http://localhost:3000`.

---

## 2. Configuração da Autenticação (Supabase)

A aplicação utiliza **autenticação por email e senha** do Supabase Auth. Não há página pública de cadastro - usuários devem ser criados manualmente no painel do Supabase.

### Criando Usuários Manualmente

1.  **Acesse o Painel do Supabase:**
    - Vá para *Authentication > Users*.

2.  **Adicione um Novo Usuário:**
    - Clique em **"Add user"** ou **"Invite user"**.
    - Preencha o **Email** e defina uma **Senha**.
    - Marque a opção **"Auto Confirm User"** (para desenvolvimento).
    - Clique em **"Create user"**.

3.  **Configure o Provider de Email:**
    - Vá para *Authentication > Providers*.
    - Certifique-se de que o provider **Email** está habilitado.

### Fazendo Login na Aplicação

1.  Acesse a rota `/login`.
2.  Insira o **email** e **senha** criados no painel do Supabase.
3.  Clique em **"Entrar"**.
4.  Após o login bem-sucedido, você será redirecionado para o dashboard (`/`).

### Verificação da Configuração

- Acesse a página `/config` na sua aplicação local.
- O card de **"Conectividade Supabase"** deve mostrar o status **"Conectado ✓"**.
- Antes do login, **"Acesso a dados"** deve estar **"Bloqueado (RLS ativa)"**. Após o login, deve mudar para **"OK"**.

---

## 3. Integrações de Webhooks

### Configurar Webhook da Kiwify

Para que o sistema receba e processe vendas automaticamente da Kiwify, siga os passos abaixo.

1.  **Obtenha o Segredo do Webhook:**
    - Na sua conta Kiwify, vá para a seção de **"Aplicativos"** ou **"Integrações"**.
    - Crie um novo webhook ou edite um existente. A Kiwify fornecerá um **"Segredo"** (uma string aleatória).
    - Copie este valor.

2.  **Configure as Variáveis de Ambiente:**
    - Abra seu arquivo `.env.local`.
    - Cole o segredo que você copiou no passo anterior na variável `KIWIFY_WEBHOOK_SECRET`.
    - Certifique-se de que `WEBHOOK_DEFAULT_USER_ID` está preenchido com o seu ID de usuário do Supabase.

3.  **Defina a URL do Webhook na Kiwify:**
    - No campo **URL**, insira a URL do endpoint da sua aplicação:
      - **Localmente (com ngrok):** `https://SUA_URL_DO_NGROK.ngrok.io/api/webhooks/kiwify`
      - **Em produção:** `https://SEU_DOMINIO.com/api/webhooks/kiwify`
    
4.  **Selecione os Eventos:**
    - Marque os eventos que você deseja receber. O sistema atualmente processa:
      - `purchase.approved` (e variações como `pix_approved`)
      - `refund.approved`
      - `chargeback`

#### Segurança e Idempotência
- **Segurança:** A rota da API valida cada requisição usando a assinatura HMAC-SHA256 enviada no header `x-kiwify-signature`. Requisições sem uma assinatura válida são rejeitadas com status `401 Unauthorized`.
- **Idempotência:** O sistema foi projetado para ser idempotente. Se a Kiwify enviar o mesmo evento várias vezes, a venda será criada apenas na primeira vez e atualizada nas vezes seguintes, evitando registros duplicados.

---

## 4. Visão Geral e Stack Técnica

O projeto é construído com Next.js (App Router) e TypeScript, utilizando Supabase para o backend (banco de dados Postgres e autenticação). A estilização é feita com Tailwind CSS e a validação de formulários é gerenciada por React Hook Form + Zod.

- **Framework Principal:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Backend & DB:** Supabase (Postgres, Auth com RLS)
- **Estilização:** Tailwind CSS (com design system customizado NoCry Group)
- **Formulários:** React Hook Form + Zod
- **Auth Helpers:** `@supabase/auth-helpers-nextjs`, `@supabase/auth-helpers-react`
- **Gerenciamento de Estado Assíncrono:** TanStack Query (`@tanstack/react-query`)
- **Gerenciamento de Estado Global:** Zustand (para filtros de data e preferências)
- **Componentes de UI:** Shadcn UI (parcialmente integrado), componentes customizados (ex: `CurrencyInputBRL`)
- **Máscaras de Input:** React Number Format (para inputs monetários)
- **Ícones:** Lucide React
- **Manipulação de Datas:** date-fns (para cálculos e formatação)
- **Design System:** NoCry Group Brand (paleta dourada, glassmorphism, gradientes radiais)

---

## 5. Arquitetura de Autenticação e Dados

### Autenticação
A autenticação é gerenciada através dos Supabase Auth Helpers, garantindo a integração entre o lado do servidor e o cliente.

- **`SupabaseProvider` e `QueryProvider`:** No `layout.tsx`, a aplicação é envolvida por esses dois provedores de contexto, disponibilizando a sessão do Supabase e o cliente do TanStack Query para todos os componentes.

- **Clientes Supabase:**
  - **Browser Client (`/src/lib/supabaseBrowserClient.ts`):** Usa `createClientComponentClient` para criar um cliente seguro para uso no navegador.
  - **Admin Client (`/src/lib/supabaseAdmin.ts`):** Usa Service Role Key para operações administrativas server-side (ex: criar usuários via API).
  - **Server Clients:** Utilizados em Server Components e API Routes para operações autenticadas do lado do servidor.

- **Hooks de Sessão:**
  - `useSession()`: Retorna os dados da sessão atual (usuário, token).
  - `useSupabaseClient()`: Retorna a instância do cliente Supabase para interagir com o DB.

### Proteção de Rotas
O sistema implementa proteção de rotas em múltiplas camadas para máxima segurança:

#### **1. Middleware de Navegação (`middleware.ts`)**
- **Runtime:** Edge (máxima performance)
- **Função:** Intercepta todas as requisições antes de chegarem às rotas
- **Comportamento:**
  - Redireciona usuários não autenticados de rotas protegidas para `/login?next=<rota_original>`
  - Redireciona usuários já autenticados de `/login` para `/`
  - Permite acesso livre a assets (`/_next/*`, `/api/*`, arquivos estáticos)
- **Vantagens:** Primeira linha de defesa, roda no Edge para latência mínima

#### **2. Group Layout Server-Side (`app/(protected)/layout.tsx`)**
- **Tipo:** Server Component
- **Função:** Valida sessão no servidor antes de renderizar qualquer página protegida
- **Comportamento:**
  - Verifica sessão usando `createServerComponentClient` e `cookies()`
  - Se não autenticado, redireciona para `/login?next=<current_route>`
  - Se autenticado, renderiza `<AppShell>{children}</AppShell>`
- **Vantagens:** Segurança server-side, impossível de bypassar no cliente

#### **3. Verificação de Admin (`app/(protected)/admin/page.tsx`)**
- **Tipo:** Server Component
- **Função:** Valida se o usuário autenticado está na whitelist de admins
- **Comportamento:**
  - Lê `NEXT_PUBLIC_ADMIN_WHITELIST` (variável de ambiente)
  - Compara email do usuário autenticado
  - Se não autorizado, exibe mensagem "Acesso restrito" (sem redirect)
  - Se autorizado, renderiza `<AdminClient />` (Client Component com form)
- **Vantagens:** Controle granular de acesso administrativo

#### **4. API Routes com Validação (`app/api/admin/create-user/route.ts`)**
- **Runtime:** Node.js (server-only)
- **Função:** Endpoint protegido para criação de usuários
- **Validação:**
  1. Verifica sessão usando `createRouteHandlerClient` e `cookies()`
  2. Valida email do admin contra `NEXT_PUBLIC_ADMIN_WHITELIST`
  3. Valida payload com Zod (email, senha mínima 6 chars)
  4. Rate limiting (10 criações/hora por admin)
- **Segurança:** Usa `SUPABASE_SERVICE_ROLE_KEY` (nunca exposta no cliente)

### Arquitetura de Dados para Dashboards
Para alimentar os dashboards, foi implementada uma arquitetura de três camadas que promove a separação de responsabilidades, reuso e performance.

1.  **Camada de Tipos (`/src/types/`):**
    - Define as "formas" dos dados (`interfaces`) que a aplicação espera. Ex: `FinanceDashboardData`, `DigitalMonthSummary`.
    - Servem como um contrato entre o frontend e a camada de serviços.
    - **Tipos Compartilhados:**
      - **`/src/types/tx.ts`**: Tipos centralizados para transações, contas, cartões e categorias:
        - `TxKind`: 'expense' | 'income' | 'transfer'
        - `Category`, `Account`, `Card`: Interfaces base
        - `Transaction`: Interface completa com joins do Supabase (arrays)
        - `TxFilters`: Interface para filtros avançados de transações
      - **`/src/types/digitalDashboard.ts`**: Tipos para métricas digitais
      - **`/src/types/financeDashboard.ts`**: Tipos para métricas financeiras
      - **`/src/types/recentActivity.ts`**: Tipos para feed de atividades

2.  **Camada de Serviços (`/src/services/`):**
    - Contém funções **puras e assíncronas** responsáveis por buscar e agregar dados do Supabase.
    - **Performance:** Utiliza `Promise.all` para executar queries em paralelo e delega agregações complexas para o banco de dados através de **Funções RPC** (ex: `get_offer_ranking_for_month`), o que é significativamente mais rápido do que processar grandes volumes de dados no lado do cliente.
    - **Exemplos:** `financeDashboard.ts`, `digitalDashboard.ts`.

3.  **Camada de Hooks (`/src/hooks/`):**
    - Conecta a UI à camada de serviços, gerenciando o ciclo de vida dos dados.
    - **Gerenciamento de Estado:** Utiliza o **TanStack Query** (`useQuery`) para caching, revalidação automática e gerenciamento de estados de `loading` e `error`.
    - **Reatividade:** As `queryKey` dinâmicas (ex: `['finance-dashboard', userId, month]`) garantem que os dados sejam automaticamente recarregados quando os parâmetros (como o mês selecionado) mudam.
    - **Exemplos:** `useFinanceDashboard.ts`, `useDigitalDashboard.ts`.

---

## 6. Design System NoCry Group

A aplicação implementa um design system completo inspirado na identidade visual da NoCry Group, com foco em elegância, sofisticação e exclusividade.

### Paleta de Cores

#### **Cores Principais**
- **Gold (Dourado Principal):** `#D4AF37` - Usado para CTAs, ícones ativos, highlights
- **Gold Dark (Dourado Escuro):** `#3E371D` - Fundos de elementos inativos, estados hover
- **Black (Preto Absoluto):** `#000000` - Base para gradientes e vinheta

#### **Cores de Texto**
- **Text (Texto Principal):** `#CACACA` - Corpo de texto, labels, placeholders
- **Muted (Texto Secundário):** `#8b8b8b` - Subtítulos, textos auxiliares

#### **Cores de UI**
- **Card Background:** `#161616` - Fundo de cards e modais
- **Border:** `rgba(255, 255, 255, 0.1)` - Bordas sutis para elementos glass

### Efeitos Visuais

#### **Glassmorphism**
A aplicação utiliza extensivamente o efeito "glass" (vidro fosco) para criar profundidade e hierarquia:

```css
.glass {
  background: rgba(22, 22, 22, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-strong {
  background: rgba(22, 22, 22, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}
```

**Onde é usado:**
- **Sidebar:** `.glass-strong` para maior destaque
- **Cards de KPI:** `.glass` para destaque sobre o gradiente
- **Chips de Data (Header):** `.glass` para sutileza
- **Modais e Forms:** `.glass` ou `.glass-strong`

#### **Fundo com Gradientes Radiais**
O fundo da aplicação utiliza 3 gradientes radiais posicionados estrategicamente + vinheta:

```tsx
// Gradientes (AppShell.tsx)
background: `
  radial-gradient(1200px 600px at 20% 0%, #7a5a10 0%, transparent 60%),
  radial-gradient(900px 500px at 80% 20%, #d4af37 0%, transparent 55%),
  radial-gradient(1000px 700px at 50% 100%, #2c240f 0%, transparent 60%),
  #000000
`

// Vinheta (escurecimento nas bordas)
background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55))'
```

**Características:**
- **Fixo com `-z-10`:** Sempre atrás do conteúdo
- **`pointer-events-none`:** Não bloqueia interações
- **Cores:** Variações de dourado (`#7a5a10`, `#d4af37`, `#2c240f`)
- **Efeito:** Cria profundidade e atmosfera premium

### Componentes de Layout

#### **AppShell (`/src/components/layout/AppShell.tsx`)**
Container principal da aplicação que gerencia:
- Fundo dourado com gradientes radiais (position absolute, -z-10)
- Vinheta para escurecimento das bordas
- Sidebar fixa à esquerda (72px colapsada, 264px expandida)
- Header sticky no topo (sem fundo, transparente)
- Main content area com padding dinâmico

**Estrutura:**
```tsx
<div className="relative min-h-screen">
  {/* Fundo dourado com -z-10 */}
  <div className="absolute inset-0 -z-10" style={{ background: gradientes }} />
  <div className="absolute inset-0 -z-10" style={{ background: vinheta }} />
  
  <Sidebar />
  
  <main className="pl-[72px]">
    <header className="sticky top-0"><Header /></header>
    <section>{children}</section>
  </main>
</div>
```

#### **Sidebar (`/src/components/layout/Sidebar.tsx`)**
Navegação lateral com design exclusivo:

**Estados:**
- **Colapsada (padrão):** 72px de largura, mostra apenas ícones
- **Expandida (hover):** 264px de largura, mostra ícones + labels

**Estilização dos Itens:**
- **Ativo:**
  - Quadrado do ícone: `bg-nocry-gold` (#D4AF37)
  - Ícone: `text-white`
  - Label: `text-white`
- **Inativo:**
  - Quadrado do ícone: `bg-nocry-goldDark` (#3E371D)
  - Ícone: `text-nocry-text` (#CACACA)
  - Label: `text-nocry-text`
- **Hover (inativo):**
  - Quadrado do ícone: `bg-[#4a3f22]` (ilumina levemente)

**Acessibilidade:**
- `aria-current="page"` no item ativo
- Focus ring dourado (`focus-visible:ring-nocry-gold`)
- Navegação via teclado

**Navegação:**
```tsx
[
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/analytics', icon: LineChart, label: 'Analytics' },
  { href: '/digital', icon: Gift, label: 'NoCry Offers' },
  { href: '/emprestimos', icon: Landmark, label: 'Empréstimos' },
  { href: '/carteira', icon: Wallet, label: 'Carteira' },
  // Separador "NOCRY OPTIONS"
  { href: '/admin', icon: Shield, label: 'Admin' },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/config', icon: Settings, label: 'Settings' },
]
```

#### **Header (`/src/components/layout/Header.tsx`)**
Cabeçalho transparente com saudação e filtros de data:

**Layout:**
- **Esquerda:**
  - Título: "Bem vindo de volta, {userName}" (`text-white text-2xl`)
  - Subtítulo: "Gerencie Seu império Financeiro Aqui" (`text-nocry-muted`)
- **Direita:**
  - Chip "De" (`.glass`, ícone Calendar dourado)
  - Separador `→`
  - Chip "Até" (`.glass`, ícone Calendar dourado)

**Características:**
- **Fundo:** Totalmente transparente (gradiente visível atrás)
- **Sticky:** Permanece no topo ao scroll
- **Chips de Data:** Efeito glass com inputs de data nativos

### Componentes de Dashboard

#### **Cards de KPI (`/src/components/dashboard/kpis/KpiCard.tsx`)**
Cards genéricos para exibir métricas:

**Visual:**
- Fundo: `.glass` (translúcido sobre gradiente)
- Ícone: Container quadrado 40x40px com `bg-nocry-goldDark`, ícone `text-nocry-gold`
- Label: `text-nocry-muted text-xs uppercase`
- Valor: `text-nocry-text text-2xl font-bold`
- Link opcional: `text-nocry-gold text-xs hover:underline`

**Variantes:**
- `KpiCard` (genérico)
- `BudgetCard` (com edição inline, barra de progresso)
- `InvoiceCard` (maior fatura do mês)
- `NextBillCard` (próxima conta fixa)

**Exemplo:**
```tsx
<KpiCard
  icon={DollarSign}
  label="SDM"
  value={formatBRL(sdmCents)}
  link={{ href: '/transacoes', label: 'Ver detalhes' }}
/>
```

### Tipografia

#### **Hierarquia de Texto**
- **Títulos Principais (H1):** `text-2xl md:text-3xl text-white font-semibold`
- **Subtítulos (H2):** `text-xl text-nocry-text font-medium`
- **Labels de Cards:** `text-xs text-nocry-muted uppercase tracking-wider`
- **Valores Monetários:** `text-2xl md:text-3xl text-nocry-text font-bold`
- **Corpo de Texto:** `text-sm md:text-base text-nocry-text`
- **Textos Auxiliares:** `text-xs text-nocry-muted`

#### **Fontes**
- **Sistema:** Inter (via next/font/google)
- **Fallback:** Arial, Helvetica, sans-serif

### Animações e Transições

#### **Sidebar Expand/Collapse**
```css
transition-all duration-300 ease-in-out
width: 72px → 264px (on hover)
```

#### **Hover States**
- **Botões:** `hover:brightness-95` (leve escurecimento)
- **Links:** `hover:underline` (sublinhado)
- **Cards Clicáveis:** `hover:scale-[1.02]` (zoom sutil)

#### **Loading States**
- **Skeleton:** Animação pulse em fundo `bg-nocry-goldDark/20`
- **Botões:** Spinner dourado + texto "Carregando..."

### Acessibilidade

✅ **Contraste:** Todas as combinações de cores passam WCAG AA  
✅ **Focus Visible:** Ring dourado em todos os elementos interativos  
✅ **ARIA Labels:** Labels descritivos em inputs sem label visual  
✅ **Navegação por Teclado:** Todos os elementos interativos acessíveis  
✅ **Estados Semânticos:** `aria-current`, `aria-invalid`, `aria-describedby`

### Responsividade

#### **Breakpoints**
- **Mobile:** < 768px (sidebar oculta/drawer, cards 1 coluna)
- **Tablet:** 768px - 1024px (2 colunas de cards)
- **Desktop:** > 1024px (3 colunas, sidebar fixa)

#### **Sidebar Mobile**
- Oculta por padrão (drawer/menu hamburger - a implementar)
- Cards empilhados verticalmente
- Header com título reduzido

---

## 7. Página de Login (Branded)

A página de login (`/login`) foi completamente redesenhada para refletir a identidade visual da NoCry Group.

### Design Visual

#### **Fundo**
- Preto absoluto `#000000` cobrindo todo o viewport
- Sem gradientes (diferente do resto da aplicação)

#### **Logo e Branding**
- **Logo:** `/logo-nocry.svg` (ouro) centralizado no topo
- **Tamanho:** `h-[150px] w-auto` (aproximado)
- **Frase:** "Se o mundo é um teatro somos nós que criamos o roteiro"
  - Posição: Abaixo do logo
  - Cor: `#CACACA`
  - Tamanho: `text-base`

#### **Card de Login**
- **Fundo:** `#161616` (dark card)
- **Borda:** `border-2 border-nocry-gold` (dourado)
- **Arredondamento:** `rounded-2xl`
- **Padding:** `p-8`
- **Largura Máxima:** `max-w-[420px]`
- **Centralizado:** Via flexbox

#### **Elementos do Form**
1. **Título:** "Login" (`text-3xl text-nocry-gold text-center`)
2. **Subtítulo:** "Digite suas credenciais de NoCry Member" (`text-nocry-text`)
3. **Inputs:**
   - **Email:** Ícone `Mail` dourado, placeholder "seu@email.com"
   - **Senha:** Ícone `Lock` dourado, type="password"
   - **Estilo:** `bg-transparent`, `text-nocry-text`, `border-b-2 border-nocry-muted`
   - **Focus:** `focus:border-nocry-gold` (borda dourada)
4. **Link "Esqueceu sua senha?":**
   - Cor: `text-nocry-gold`
   - Ação: Abre `AlertDialog` (shadcn/ui)
   - Mensagem: "Entre em contato com o desenvolvedor para redefinição de senha."
5. **Botão "Entrar":**
   - Fundo: `bg-nocry-gold`
   - Texto: `text-black font-semibold`
   - Altura: `h-12`
   - Hover: `hover:brightness-95`
   - Loading: Spinner + texto "Entrando..."

#### **Footer**
- Texto: "© 2025 NoCry Group • Todos os direitos reservados"
- Cor: `#CACACA`
- Tamanho: `text-sm`
- Posição: Centralizado, parte inferior

### Validação e Segurança

#### **Validação Client-Side (Zod)**
```tsx
const loginSchema = z.object({
  email: z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório'),
  password: z.string().min(5, 'Senha deve ter no mínimo 5 caracteres'),
});
```

#### **Autenticação**
- **Método:** `supabase.auth.signInWithPassword({ email, password })`
- **Resposta a Erros:**
  - `Invalid login credentials` → "E-mail ou senha incorretos."
  - Outros erros → Mensagem traduzida ou original
- **Redirecionamento:** Para `?next=` param ou `/` após sucesso

#### **Estados**
- **Carregando:** Botão desabilitado com spinner
- **Erro:** Mensagem em vermelho abaixo do form
- **Já Logado:** Card com mensagem + botões para Dashboard e Config

### Acessibilidade
- Labels associados aos inputs (`htmlFor` / `id`)
- `aria-invalid` em inputs com erro
- `aria-describedby` para mensagens de erro
- Focus ring dourado visível
- Navegação por teclado funcional

### Redirecionamento Pós-Login
A página respeita o parâmetro `?next=` da URL:
```tsx
const nextUrl = searchParams.get('next') || '/';
router.replace(nextUrl);
```

Isso permite que o middleware redirecione usuários não autenticados para `/login?next=/transacoes` e, após o login, eles sejam automaticamente levados de volta para `/transacoes`.

---

## 8. Schema do Banco de Dados

Os scripts SQL para a criação do schema estão localizados em `/supabase/sql/`.

### Módulo Digital (`001_digital.sql`, `002_fix_offer_summary_view.sql`, `004_kiwify_integration.sql`)
- **Tabelas:** `offers`, `channels`, `campaigns`, `spend_events`, `sales`, `work_sessions`.
- **Segurança:** Habilita **Row Level Security (RLS)** em todas as tabelas, com políticas que garantem que um usuário só pode acessar e modificar seus próprios dados (`user_id = auth.uid()`).
- **Dados:** Valores monetários são armazenados como `bigint` (centavos).
- **View `offer_summary`:** Cria uma visão otimizada que agrega diariamente os gastos, receitas, lucros e tempo investido por oferta.
- **Integração:** Adiciona colunas (`source`, `external_id`) e índices únicos para suportar a integração com webhooks (ex: Kiwify) de forma idempotente.

### Módulo Finanças Pessoais (`003_personal_finance.sql`, `020_financas.sql`, `021_categories_archived.sql`, `022_fixed_bills_last_run.sql`, `030_budgets.sql`)
- **Tabelas Principais:**
  - `accounts`: Contas financeiras (corrente, poupança, carteira).
  - `cards`: Cartões de crédito, com informações de limite, fechamento e vencimento.
  - `fixed_bills`: Contas recorrentes com valor e data fixos. Inclui `last_run_month` para controle de lançamentos automáticos.
  - `categories`: Categorias de despesas e receitas personalizáveis pelo usuário. A tabela inclui uma coluna `archived` para permitir "soft delete".
  - `transactions`: Tabela central que registra todas as movimentações financeiras.
  - `budgets`: Orçamentos mensais definidos pelo usuário para controle de gastos (formato: YYYY-MM).
- **Regras de Negócio (em `transactions`):**
  - **Exclusividade:** Uma transação do tipo `expense` ou `income` deve estar associada a uma `account_id` **OU** a uma `card_id`, mas não a ambos.
  - **Transferências:** Uma transferência é representada por **duas** transações com o mesmo `transfer_group_id`: uma de saída da conta de origem e uma de entrada na conta de destino.
- **Views de Análise:**
  - `pf_month_summary`: Visão que calcula o resumo do mês corrente (despesas, receitas, saldo) para o usuário autenticado.
  - `card_invoices_current`: Visão complexa que calcula o valor da fatura em aberto para cada cartão, determinando o ciclo correto com base no dia de fechamento.
- **Funções (RPC):** Para otimizar consultas complexas, o sistema utiliza Funções de Banco de Dados. Ex: `get_offer_ranking_for_month` agrega e ordena os dados de ofertas diretamente no Postgres.

### Módulo de Empréstimos (`040_loans.sql`)
- **Modelo de Eventos:** Sistema baseado em eventos para gerenciar empréstimos pessoa-a-pessoa.
- **Tabelas:**
  - `loans`: Registro principal do empréstimo com pessoa e anotações.
  - `loan_events`: Eventos financeiros (out=emprestei, in=recebi, interest=juros).
- **View `loan_balances`:** Calcula automaticamente o saldo de cada empréstimo:
  - Fórmula: `balance_cents = out_cents + interest_cents - in_cents`
  - Interpretação: saldo > 0 (pessoa deve), saldo < 0 (eu devo), saldo = 0 (quitado)
- **Segurança:** RLS em todas as tabelas, CASCADE ao deletar empréstimo.
- **Validações:** `amount_cents > 0`, `type in ('out','in','interest')`.

---

## 9. Funcionalidades e Rotas Implementadas

### Dashboard Principal

- **`/` (Dashboard):**
  - **Visão Unificada:** Página principal que consolida os indicadores chave de Finanças Pessoais e Desempenho Digital.
  - **Reatividade:** O dashboard é reativo ao período selecionado (De/Até), utilizando o store Zustand `useDateRange` sincronizado com a query string (`?from=YYYY-MM-DD&to=YYYY-MM-DD`).
  - **Header Estático:** Componente `DashboardHeader` dedicado ao Dashboard com:
    - Título personalizado: "Bem vindo de volta, Membro"
    - Filtros de data (De/Até) com chips `.glass` e ícones `Calendar`
    - Sincronização bidirecional: Store Zustand ↔ URL
    - Comportamento: Rola para fora da tela quando o usuário scrola para baixo
    - Deep linking: URLs compartilháveis com período (ex: `/?from=2025-01-01&to=2025-01-31`)
  
  - **Seção de Finanças (Cards de KPI):**
    Implementa 6 cards principais com design `.glass` sobre o gradiente dourado:
    
    1. **SDM (Saldo Disponível no Mês):**
       - Ícone: `DollarSign` em container `bg-nocry-goldDark`
       - Cálculo: `free_balance + confirmed_income - monthly_fixed_bills - reserves`
       - Fonte de dados: `useFinanceKpis` hook
       - Link: "Ver transações" → `/transacoes`
    
    2. **Total Saídas (Despesas do Mês):**
       - Ícone: `TrendingDown`
       - Cálculo: Soma de `transactions` com `type='expense'` no período `from-to`
       - Fonte de dados: `useFinanceKpis` hook
       - Valor em vermelho para destaque
    
    3. **Total Entradas (Receitas do Mês):**
       - Ícone: `TrendingUp`
       - Cálculo: Soma de `transactions` com `type='income'` no período `from-to`
       - Fonte de dados: `useFinanceKpis` hook
       - Valor em verde para destaque
    
    4. **Orçamento do Mês:**
       - Ícone: `Target`
       - Edição inline com `CurrencyInput` (RHF + Zod)
       - Barra de progresso visual (`spentThisMonth / budgetCents`)
       - Cálculos:
         - `budgetLeft = max(0, budgetCents - spentThisMonth)`
         - `canSpendToday = floor(budgetLeft / max(1, daysLeft))`
       - Mutation: `setBudget` com optimistic updates
       - Fonte de dados: `useBudget` hook
    
    5. **Fatura Atual (Maior Cartão):**
       - Ícone: `CreditCard`
       - Exibe fatura do cartão com maior saldo em aberto
       - Informações: nome do cartão, valor, dias para vencimento
       - Fonte de dados: `useCurrentInvoices` hook
       - Link: "Ver faturas" → `/faturas`
    
    6. **Próxima Conta Fixa:**
       - Ícone: `Calendar`
       - Exibe próxima conta fixa a vencer (ordenada por `day_of_month`)
       - Informações: nome, valor, dia do vencimento
       - Fonte de dados: `useNextFixedBill` hook
       - Link: "Ver fixas" → `/fixas`
  
  - **Seção "Desempenho Digital":**
    Localizada abaixo da seção de finanças, apresenta métricas de negócios digitais do período selecionado.
    
    **Componentes:**
    
    1. **DigitalKpiRow** (`/src/components/digital/DigitalKpiRow.tsx`):
       - Grid responsivo com 5 KPI cards (1 col mobile, 2 col tablet, 5 col desktop)
       - Cada card usa o componente `DigitalKpi` com design `.glass`
       
       **KPIs Exibidos:**
       - **Gasto Total:** Valor em centavos, cor vermelha (`text-red-400`)
       - **Receita Total:** Valor em centavos, cor verde (`text-green-400`)
       - **ROI (Return on Investment):**
         - Cálculo: `revenueCents / spendCents`
         - Formatação: Percentual (ex: 250%)
         - Cores dinâmicas:
           - Verde (`ok`): ROI ≥ 1 (lucro)
           - Amarelo (`warning`): 0.8 ≤ ROI < 1 (quase no break-even)
           - Vermelho (`danger`): ROI < 0.8 (prejuízo)
       - **CAC (Custo de Aquisição de Cliente):**
         - Cálculo: `spendCents / salesCount`
         - Valor por venda (em centavos)
         - Subtexto: "X vendas"
         - Cor verde se CAC ≤ Ticket Médio (saudável)
       - **Ticket Médio:**
         - Cálculo: `revenueCents / salesCount`
         - Valor médio por venda (em centavos)
         - Subtexto: "X vendas"
       
       **Estados:**
       - Loading: Skeleton com animação pulse
       - Erro: Ícone de alerta + botão "Tentar de novo" (chama `refetch`)
       - Sem dados: Exibe "—" (travessão)
    
    2. **TopOffers** (`/src/components/digital/TopOffers.tsx`):
       - Tabela com as 5 ofertas de melhor desempenho no período
       - Design: Card `.glass` com tabela estilizada
       
       **Colunas:**
       - **#**: Posição no ranking (1-5) em dourado
       - **Oferta**: Nome da oferta
       - **Gasto**: Valor em centavos, cor vermelha
       - **Receita**: Valor em centavos, cor verde
       - **ROI**: Percentual com cor dinâmica (mesmo esquema dos KPIs)
       - **Vendas**: Quantidade de vendas
       
       **Ordenação:** Por lucro (receita - gasto) descendente
       
       **Estados:**
       - Loading: 5 linhas skeleton com animação pulse
       - Erro: Mensagem + botão "Tentar de novo"
       - Vazio: "Nenhuma oferta encontrada para o período selecionado"
    
    **Integração:**
    - Hooks: `useDigitalKpis` e `useTopOffers` (TanStack Query)
    - Período: Sincronizado com `useDateRange` store
    - Serviços: `getDigitalMonthSummary` e `getOfferRanking` (RPC functions)
    - Revalidação: Automática quando o período muda (query keys dinâmicas)
  
  - **Feed de Atividades Recentes:** Lista as 10 últimas atividades (finanças + digital + empréstimos).

### Rotas de Autenticação e Configuração

- **`/login`**:
  - Página de autenticação com **email e senha** (`signInWithPassword`).
  - **Validação:** React Hook Form + Zod (email válido, senha mínima 6 caracteres).
  - **Segurança:** Senha nunca é logada, sem página de cadastro público.
  - **UX:** Loading state no botão, mensagens de erro claras e traduzidas.
  - **Acessibilidade:** Labels corretos, `aria-invalid`, `aria-describedby`.
  - **Redirecionamento:** Automático para `/` após login bem-sucedido.
  - Se já estiver logado, exibe card com botões para Dashboard e Configurações.

- **`/admin`**:
  - **Acesso Restrito:** Apenas emails na `NEXT_PUBLIC_ADMIN_WHITELIST` podem acessar.
  - **Criação de Usuários:** Formulário validado (RHF + Zod) para criar novos usuários.
  - **Segurança:** API server-only usa `SUPABASE_SERVICE_ROLE_KEY` (nunca exposta no cliente).
  - **Rate Limiting:** Máximo 10 criações por hora por administrador (proteção anti-abuso).
  - **Feedback Visual:** Toast messages, loading states, lista de usuários recém-criados.
  - **API Route:** `POST /api/admin/create-user` com validação dupla de whitelist.

- **`/config`**:
  - **Healthcheck:** Realiza testes seguros para verificar a conectividade com o Supabase e o status do acesso a dados (RLS).
  - **Logout:** Contém o botão para encerrar a sessão do usuário.

### Ferramentas de Desenvolvimento

- **`/dev/seed`**:
  - **Acesso Restrito:** Página disponível apenas se `NEXT_PUBLIC_DEV_TOOLS` for `"true"`. Requer que o usuário esteja autenticado.
  - **Funcionalidades:** Permite criar dados de demonstração (ofertas, gastos, vendas, etc.) com um clique, associando-os ao usuário logado.

### Módulo Principal: Digital

- **`/digital` (Dashboard):**
  - Exibe um dashboard com as principais métricas de desempenho para o mês selecionado.
  - **Cards de Resumo:** Apresenta totais de Gasto, Receita, ROI, CAC, Ticket Médio e Tempo.
  - **Tabela de Ofertas:** Detalha o desempenho por oferta, com links para a página de detalhes.

- **`/digital/oferta/[id]` (Detalhe da Oferta):**
  - Página dinâmica que exibe o desempenho de uma oferta específica.
  - **Header:** Mostra o nome da oferta e os totais de gasto, receita e lucro para o período.
  - **Lista Diária:** Apresenta o desempenho (gasto vs. receita) dia a dia.

- **`/digital/registrar` (Registro Manual):**
  - **Formulários com Abas:** Permite ao usuário registrar um **Gasto** ou uma **Venda** manualmente.
  - **Validação:** Utiliza `react-hook-form` e `zod` para validar os dados do formulário.
  - **Integração com Serviços:** Chama as funções de serviço correspondentes, passando o `userId` para satisfazer a RLS.

### Primeira Experiência do Usuário

- **`/onboarding`**:
  - **Wizard de 3 Passos:** Guia o novo usuário na configuração inicial de sua conta.
  - **Passo 1:** Cadastro de Contas.
  - **Passo 2:** Cadastro de Cartões (opcional).
  - **Passo 3:** Configuração de uma despesa fixa e uma oferta digital (opcional).
  - **Persistência:** Ao concluir, os dados são salvos no Supabase, respeitando a RLS.

### Módulo de Finanças Pessoais

- **`/categorias`**:
  - **CRUD Completo:** Página dedicada ao gerenciamento de categorias de despesas e receitas.
  - **Interface com Abas:** Separa a visualização e criação de categorias de "Despesas" e "Receitas".
  - **Ações:** Permite ao usuário criar, renomear, arquivar e restaurar categorias.
  - **Estado Vazio e Carregamento:** A interface trata os estados de carregamento e exibe mensagens amigáveis quando não há categorias.

- **`/transacoes`**:
  - **Interface com Abas:** Permite ao usuário registrar **Despesas**, **Receitas** e **Transferências**.
  - **Formulários Validados:** Utiliza `react-hook-form` e `zod` para validação.
  - **Filtros Avançados:** Além do seletor de mês, a página agora inclui filtros por **Conta**, **Cartão**, **Categoria** e uma **busca por texto** na descrição da transação.
  - **Busca Otimizada:** A busca por texto utiliza um `debounce` customizado para evitar requisições excessivas enquanto o usuário digita.
  - **Exportação CSV:** Oferece um botão para exportar a lista de transações (já filtrada) para um arquivo `.csv`.
  - **Listagem Mensal:** Exibe um extrato de todas as transações do mês selecionado, com totalizadores.
  - **Atividades Recentes:** Painel lateral (desktop) ou abaixo (mobile) com as 10 últimas transações financeiras.

- **`/faturas`**:
  - **Listagem de Cartões:** Exibe todos os cartões com informações de ciclo e fatura.
  - **Faturas Atuais e Fechadas:** Para cada cartão, mostra:
    - Fatura atual (em aberto) com ciclo, valor e dias para vencimento
    - Fatura fechada (ciclo anterior) com opção de pagamento
  - **Pagamento de Faturas:** Modal para registrar pagamento com seleção de conta de origem.
  - **Cálculo de Ciclos:** Utiliza `dayjs` para cálculos robustos de datas, considerando fechamento e vencimento.

- **`/fixas`**:
  - **CRUD de Contas Fixas:** Tabela para listar, criar, editar e ativar/desativar contas fixas.
  - **Lançamento Automático:** Botão "Lançar fixas do mês" que:
    - Calcula a data de vencimento (dia do mês)
    - Cria transações do tipo `expense`
    - Marca `last_run_month` para evitar duplicatas
    - Suporta tanto conta quanto cartão como destino

- **`/carteira` (Hub de Configurações e Lançamentos)**:
  - **Propósito:** Página central para gerenciar todas as configurações financeiras e realizar lançamentos rápidos.
  - **Design:** Tema dourado com glassmorphism, componentes reutilizáveis (CardGlass, TabsPills, Drawer).
  - **Header Local:** Título "Carteira" + subtítulo "Configurações e Lançamentos".
  
  - **Ações Rápidas (Barra Superior):**
    - **Botões de Lançamento:**
      - `+Receita`: Abre drawer com formulário de receita
      - `+Despesa`: Abre drawer com formulário de despesa
      - `+Transferir`: Abre drawer para transferência entre contas
      - `+Lançar conta fixa`: Abre drawer para lançamento manual de fixas
    - **Busca Global:** Input integrado com store `useWalletSearch` (compartilhado entre todas as abas)
  
  - **Sistema de Abas:**
    Componente `WalletTabs` com navegação via `TabsPills`:
    
    1. **Aba "Geral":**
       - **Layout:** Grid responsivo (8 cols + 4 cols no desktop)
       - **Últimas Transações:** Card glass com lista das 10 transações mais recentes
       - **Contas:** Card lateral com resumo de contas ativas
       - **Cartões:** Card lateral com resumo de cartões ativos
       - **Estados:** Empty states com CTAs para criar primeira conta/cartão
    
    2. **Aba "Categorias":**
       - **CRUD Completo:** Criar, Editar, Arquivar (soft delete)
       - **Filtros:**
         - Tipo: Todas / Despesas / Receitas
         - Busca: Por nome (integrada com `useWalletSearch`)
       - **Layout:** Grid responsivo 1/2/3 colunas
       - **Exibição:** Cards com nome, tipo (💸/💰), botões Editar/Excluir
       - **Drawer:** Form com validação (Zod + RHF) para nome e tipo
       - **Feedback:** Toast notifications após todas ações
       - **Hooks:** `useCategoriesList`, `useCreateCategory`, `useUpdateCategory`, `useArchiveCategory`
       - **Service:** `/src/services/categories.ts` com RLS
       - **SQL:** `021_categories_set_default_user.sql` (user_id default, RLS, index)
    
    3. **Aba "Transações":**
       - **Filtros Avançados:**
         - **Período:** Integrado com `useDateRange` store (De/Até sincronizado com URL)
         - **Tipo:** Todas / Despesas / Receitas / Transferências
         - **Conta:** Dropdown com todas as contas
         - **Cartão:** Dropdown com todos os cartões
         - **Categoria:** Dropdown com todas as categorias
         - **Busca:** Por descrição (integrada com `useWalletSearch`)
       - **Listagem:**
         - Grid compacto: Data, Descrição, Categoria, Conta/Cartão, Valor, Ações
         - Valores coloridos (verde: receitas, vermelho: despesas)
         - Paginação (25 itens por página)
       - **Ações por Linha:**
         - **Editar:** Abre drawer com formulário preenchido
         - **Duplicar:** Abre drawer com dados copiados
         - **Excluir:** Confirmação + hard delete
         - **Reconciliar:** Toggle de status `reconciled` (verde quando conciliado)
       - **Totalizadores:** Entradas, Saídas, Saldo (calculados para o período filtrado)
       - **Exportação CSV:** Botão para download das transações filtradas
       - **Estados:** Loading skeletons, empty state com mensagem contextual
       - **Hooks:** `useTransactions`, `useDeleteTransaction`, `useToggleReconciled`
       - **SQL:** `022_transactions_add_reconciled.sql` (coluna `reconciled` boolean)
    
    4. **Aba "Contas":**
       - **CRUD Completo:** Criar, Editar, Arquivar (soft delete)
       - **Busca:** Por nome (integrada com `useWalletSearch`)
       - **Layout:** Grid responsivo 1/2/3 colunas
       - **Exibição:** Cards com:
         - Nome da conta
         - Observações (line-clamp 2 linhas)
         - Botões Editar/Excluir
       - **Drawer:** Form com validação (Zod + RHF):
         - Nome (obrigatório, min 2 chars)
         - Observações (textarea opcional para detalhes, agência, etc.)
       - **Feedback:** Toast notifications após todas ações
       - **Hooks:** `useAccountsList`, `useCreateAccount`, `useUpdateAccount`, `useArchiveAccount`
       - **Service:** `/src/services/accounts.ts` com soft delete via `archived=true`
       - **SQL:** `023_accounts_rls.sql` (user_id default, RLS, índices, colunas `archived` e `notes`)
    
    5. **Aba "Contas Fixas":**
       - **CRUD Completo:** Criar, Editar, Ativar/Desativar, Excluir
       - **Filtros:**
         - Tipo: Todas / Despesas / Receitas
         - Status: Todas / Ativas / Inativas
         - Busca: Por nome (integrada com `useWalletSearch`)
       - **Layout:** Grid responsivo 1/2/3 colunas
       - **Exibição:** Cards com:
         - Nome, tipo (💸 Despesa / 💰 Receita)
         - Dia do mês, valor formatado (BRL)
         - Botões: Editar, Ativar/Desativar (toggle com cor verde/cinza), Excluir
       - **Drawer:** Form com validação (Zod + RHF):
         - Nome (obrigatório)
         - Tipo (radio: Despesa/Receita)
         - Valor (CurrencyInputBRL)
         - Dia (1-28, evita problemas com meses variáveis)
         - Conta OU Cartão (validação exclusiva - não pode ambos)
         - Categoria (opcional)
         - Ativa (checkbox, padrão true)
       - **Lançamento Mensal:** Botão "Lançar fixas do mês":
         - Executa RPC `launch_fixed_for_month`
         - Idempotente (não cria duplicatas)
         - Invalida queries de transações e KPIs
         - Toast com feedback
       - **Feedback:** Toast notifications após todas ações
       - **Hooks:** `useFixedList`, `useCreateFixed`, `useUpdateFixed`, `useToggleFixedActive`, `useRemoveFixed`, `useLaunchFixed`
       - **Service:** `/src/services/fixed.ts` com mapeamento `day_of_month` ↔ `due_day`, `is_active` ↔ `active`
       - **SQL:** `024_fixed_expenses_rls.sql` (user_id default, RLS, índices compostos, colunas `category_id` e `type`)
       - **Tabela Real:** `fixed_bills` (não `fixed_expenses`)
    
    6. **Aba "Cartões":**
       - ⚠️ **Status:** Placeholder (a implementar)
       - **Funcionalidades Planejadas:** CRUD de cartões, gestão de limite, fechamento, vencimento

### Módulo de Empréstimos

- **`/emprestimos`**:
  - **Listagem em Cards:** Exibe todos os empréstimos com:
    - Nome da pessoa
    - Saldo colorido (verde=a receber, vermelho=você deve, cinza=quitado)
    - Valores detalhados (emprestado, recebido, juros)
    - Nota/descrição
  - **Modal de Novo Empréstimo:** Form com validação (RHF + Zod) para criar empréstimo.
  - **Total a Receber:** Exibido no header (soma de todos os saldos positivos).
  - **Toast de Feedback:** Sucesso/erro com auto-dismiss.

- **`/emprestimos/[id]`**:
  - **Cabeçalho Detalhado:** Pessoa, saldo, badge de status, resumo de valores.
  - **Form de Eventos:** Permite adicionar:
    - **Tipo:** ➖ Emprestei (out), ➕ Recebi (in), 🎁 Juros (interest)
    - **Valor:** CurrencyInput em centavos
    - **Data:** Input date (YYYY-MM-DD)
    - **Descrição:** Textarea opcional
  - **Timeline:** Últimos 10 eventos com emojis, valores formatados e descrições.
  - **Invalidação Automática:** Queries `['loans', userId]` e `['loans', userId, loanId, 'timeline']`.

---

## 10. Estrutura de Serviços e Componentes Chave

### Serviços de Backend
- **`/src/services/categories.ts`**: Centraliza as operações de CRUD (Listar, Criar, Atualizar, Arquivar) para as categorias.
  - `listCategories`: Busca com filtros (q, type), exclui arquivadas
  - `createCategory`: Insere nova categoria
  - `updateCategory`: Atualiza categoria existente
  - `deleteOrArchiveCategory`: Soft delete (archived=true)
  - **RLS:** user_id automático via auth.uid()
  
- **`/src/services/accounts.ts`**: Gerencia contas bancárias/carteiras:
  - `listAccounts`: Busca com filtro de nome, exclui arquivadas
  - `createAccount`: Cria conta com nome e observações
  - `updateAccount`: Atualiza nome e observações
  - `archiveAccount`: Soft delete (archived=true)
  - **RLS:** user_id automático via auth.uid()
  
- **`/src/services/fixed.ts`**: Gerencia contas fixas (recorrentes):
  - `listFixed`: Busca com filtros (q, type, active)
  - `createFixed`: Cria conta fixa com validação de conta OU cartão
  - `updateFixed`: Atualiza conta fixa existente
  - `toggleActive`: Ativa/desativa conta fixa
  - `removeFixed`: Hard delete (pode estar vinculada a transações)
  - `launchFixedForMonth`: RPC para lançamento mensal idempotente
  - **Mapeamento:** `day_of_month` ↔ `due_day`, `is_active` ↔ `active`
  - **Tabela Real:** `fixed_bills` (não `fixed_expenses`)
  - **RLS:** user_id automático via auth.uid()
  
- **`/src/services/digital.ts`**: Centraliza toda a lógica de interação com o banco de dados para o módulo Digital.

- **`/src/services/finance.ts`**: Centraliza a lógica de negócios para o módulo de Finanças Pessoais:
  - `createExpense`, `createIncome`, `createTransfer`
  - `listMonthTransactions` com filtros avançados (conta, cartão, categoria, texto)
  - `createFixedBill` para contas recorrentes
  - Todas as funções exigem `userId` explícito para RLS
  
- **`/src/services/budgets.ts`**: Gerencia orçamentos mensais:
  - `getBudget(supabase, userId, monthStr)` - busca orçamento do mês
  - `setBudget(supabase, userId, { monthStr, amountCents })` - upsert de orçamento
  
- **`/src/services/loans.ts`**: Sistema completo de empréstimos:
  - `listLoansWithBalance` - lista com saldos calculados
  - `createLoan` - cria registro de empréstimo
  - `addEvent` - adiciona evento (out/in/interest)
  - `getLoanTimeline` - busca eventos ordenados
  - `updateLoan`, `deleteLoan` - CRUD completo
  
- **`/src/services/invoices.ts`**: Gerencia faturas de cartões:
  - `getCardCycles` - calcula ciclos de fatura (atual e fechada)
  - `payCardInvoice` - registra pagamento como transferência
  
- **`/src/services/fixedBills.ts`**: Gerencia contas fixas:
  - `listFixedBills`, `updateFixedBill`
  - `runFixedForMonth` - lança automaticamente as fixas do mês
  
- **`/src/services/*Dashboard.ts`**: Serviços dedicados a buscar dados já agregados para os dashboards.

- **`/src/services/recentActivity.ts`**: Busca atividades recentes de todas as áreas (finanças, digital, empréstimos).

### Utilitários
- **`/src/lib/debounce.ts`**: Utilitário interno que fornece a função `debounce` e o hook `useDebouncedValue`, removendo a necessidade de dependências externas como `lodash`.
- **`/src/lib/money.ts`**: Contém funções utilitárias para formatar (`formatBRL`) e parsear (`parseBRL`) valores monetários, garantindo a conversão correta entre strings (R$) e inteiros (centavos).
- **`/src/lib/dateSafe.ts`**: Utilitário com `dayjs` para manipulação segura de datas:
  - `clampDay(year, month, day)` - garante dias válidos no mês
  - `safeISODate(year, month, day)` - retorna ISO string segura
  - Utilizado em cálculos de ciclos de cartão para evitar `Invalid Date`.

### Hooks de Dashboard (TanStack Query)

#### **Hooks de Finanças Pessoais (`/src/hooks/dashboard/`)**
- **`useFinanceKpis.ts`**: Busca KPIs financeiros (SDM, total de saídas, total de entradas)
  - Parâmetros: `userId`, `from`, `to`, `userTimeZone`
  - Query Key: `['finance-kpis', userId, from, to]`
  - Retorna: `{ sdmCents, totalExpenseCents, totalIncomeCents, isLoading, error }`

- **`useBudget.ts`**: Gerencia orçamento mensal
  - Parâmetros: `userId`, `monthStr` (YYYY-MM)
  - Query Key: `['budget', userId, monthStr]`
  - Mutation: `setBudget` com optimistic updates
  - Invalidação: `['finance-dashboard', userId, monthStr]` após mutation

- **`useCurrentInvoices.ts`**: Busca faturas de cartões
  - Parâmetros: `userId`
  - Query Key: `['current-invoices', userId]`
  - Retorna: `{ invoices: Array<CardInvoice>, biggestInvoice, isLoading, error }`

- **`useNextFixedBill.ts`**: Busca próxima conta fixa
  - Parâmetros: `userId`
  - Query Key: `['next-fixed-bill', userId]`
  - Retorna: `{ bill: FixedBill | null, isLoading, error }`

#### **Hooks de Digital (`/src/hooks/digital/`)**
- **`useDigitalDashboard.ts`**: Busca métricas digitais (gasto, receita, ROI, etc.)
  - Parâmetros: `userId`, `month`
  - Query Key: `['digital-dashboard', userId, month]`
  - Retorna: `{ summary, ranking, isLoading, error }`

- **`useDigitalKpis.ts`**: Busca e calcula KPIs digitais para o Dashboard principal
  - Parâmetros: `from` (ISO), `to` (ISO)
  - Query Key: `['digitalKpis', userId, from, to]`
  - Serviço: Utiliza `getDigitalMonthSummary` do `digitalDashboard.ts`
  - Cálculos automáticos:
    - **ROI**: `revenueCents / spendCents` (null se gasto = 0)
    - **CAC**: `spendCents / salesCount` (null se vendas = 0)
    - **Ticket Médio**: `revenueCents / salesCount` (null se vendas = 0)
  - Retorna: `{ spendCents, revenueCents, salesCount, roi, cacCents, ticketCents, isLoading, isError, refetch }`

- **`useTopOffers.ts`**: Busca ranking das top N ofertas por performance
  - Parâmetros: `from` (ISO), `to` (ISO), `limit` (padrão: 5)
  - Query Key: `['topOffers', userId, from, to, limit]`
  - Serviço: Utiliza `getOfferRanking` do `digitalDashboard.ts`
  - Retorna: Array de `TopOfferItem` com:
    - `offerId`, `offerName`, `spendCents`, `revenueCents`, `salesCount`, `roi`
  - Ordenação: Por lucro (receita - gasto) descendente

#### **Hooks de Atividades (`/src/hooks/`)**
- **`useRecentActivity.ts`**: Busca atividades recentes globais
  - Parâmetros: `userId`
  - Query Key: `['recent-activity', userId]`
  - Retorna: `{ activities: RecentActivityItem[], isLoading, error }`

- **`useRecentFinance.ts`**: Busca atividades recentes de finanças
  - Parâmetros: `userId`, `filters` (month, account, card, category, search)
  - Query Key: `['recent-finance', userId, ...filters]`
  - Retorna: `{ activities: RecentActivityItem[], isLoading, error }`

#### **Utilitários e Estado Global**
- **`/src/hooks/useMonthParam.ts`**: Hook reutilizável para gerenciar o estado do mês selecionado através dos parâmetros da URL.
  - Retorna: `{ month, setMonth }` com sincronização via query string (`?m=YYYY-MM`)

#### **Hooks de Carteira (`/src/hooks/finance/`)**

- **`categories.ts`**: Hooks para categorias
  - `useCategoriesList({ q, type })`: Lista com filtros
  - `useCreateCategory()`: Mutation para criar
  - `useUpdateCategory()`: Mutation para atualizar
  - `useArchiveCategory()`: Mutation para arquivar (soft delete)
  - Invalidação: `['categories']`

- **`accounts.ts`**: Hooks para contas
  - `useAccountsList(q)`: Lista com busca por nome
  - `useCreateAccount()`: Mutation para criar
  - `useUpdateAccount()`: Mutation para atualizar
  - `useArchiveAccount()`: Mutation para arquivar (soft delete)
  - Invalidação: `['accounts']`
  - Cache: 5 minutos

- **`fixed.ts`**: Hooks para contas fixas
  - `useFixedList({ q, type, active })`: Lista com filtros
  - `useCreateFixed()`: Mutation para criar
  - `useUpdateFixed()`: Mutation para atualizar
  - `useToggleFixedActive()`: Mutation para ativar/desativar
  - `useRemoveFixed()`: Mutation para excluir (hard delete)
  - `useLaunchFixed()`: Mutation para lançamento mensal (RPC)
  - Invalidação: `['fixed-expenses']`, `['transactions']`, `['finance-kpis']`
  - Cache: 5 minutos

- **`transactions.ts`**: Hooks para transações
  - `useTransactions(filters)`: Lista paginada com filtros avançados
    - Filtros: `from`, `to`, `kind`, `accountId`, `cardId`, `categoryId`, `q`, `page`, `pageSize`
    - Retorna: `rows`, `total`, `page`, `pageSize`, `totals` (expense, income, net)
    - Joins automáticos: `account`, `card`, `category`
  - `useDeleteTransaction()`: Mutation para excluir
  - `useToggleReconciled()`: Mutation para conciliar/desconciliar
  - Invalidação: `['transactions']`, `['finance-kpis']`, `['card-invoice-current']`
  - Cache: 10 segundos

- **`lookups.ts`**: Hooks para selects
  - `useAccounts()`: Lista contas ativas
  - `useCards()`: Lista cartões ativos
  - `useCategoriesForSelect(kind?)`: Lista categorias por tipo
  - Cache: 5 minutos

#### **Stores Zustand (`/src/stores/`)**

- **`dateRange.ts`**: Store global para gerenciamento de período (De/Até) no Dashboard
  - **Estado:**
    - `from`: string (ISO YYYY-MM-DD) - Data inicial
    - `to`: string (ISO YYYY-MM-DD) - Data final
  - **Ações:**
    - `setFrom(iso)`: Atualiza apenas a data inicial
    - `setTo(iso)`: Atualiza apenas a data final
    - `setRange({ from?, to? })`: Atualiza ambas de uma vez
    - `reset()`: Volta ao padrão (mês atual)
  - **Default:** Primeiro dia do mês atual → Último dia do mês atual
  - **Uso:** Sincronizado com URL via `DashboardHeader`, consumido por todos os hooks de KPIs
  - **Benefícios:**
    - Estado persistente entre re-renders
    - Compartilhado entre múltiplos componentes
    - Performance (sem prop drilling)
    - Type-safe com TypeScript

- **`walletSearch.ts`**: Store local para busca na Carteira
  - **Estado:**
    - `q`: string - Termo de busca
  - **Ações:**
    - `setQ(value)`: Atualiza termo de busca
  - **Uso:** Compartilhado entre todas as abas de `/carteira` (Categorias, Contas, Fixas)
  - **Benefícios:** Busca unificada sem prop drilling

### Componentes de UI Reutilizáveis

#### **Componentes da Carteira (`/src/components/carteira/`)**

- **`WalletHeader.tsx`**: Header local da página Carteira
  - Título "Carteira" + subtítulo "Configurações e Lançamentos"
  - Estático (não sticky)

- **`WalletActions.tsx`**: Barra de ações rápidas
  - Botões: +Receita, +Despesa, +Transferir, +Lançar conta fixa
  - Input de busca global (store `useWalletSearch`)
  - Drawers placeholder para cada ação

- **`WalletTabs.tsx`**: Sistema de abas principal
  - Controla aba ativa via `useState`
  - Renderiza condicionalmente o conteúdo da aba
  - Utiliza `TabsPills` para navegação

- **`WalletCards.tsx`** (Aba "Geral"):
  - Grid responsivo: 8 cols (transações) + 4 cols (contas/cartões)
  - Empty states para cada seção

- **`tabs/WalletCategories.tsx`** (Aba "Categorias"):
  - Grid 1/2/3 colunas com cards de categorias
  - Filtros: Tipo (todas/despesas/receitas)
  - CRUD completo com drawers
  - Loading skeletons, empty states, toast notifications

- **`tabs/WalletTransactions.tsx`** (Aba "Transações"):
  - Filtros avançados: Período, Tipo, Conta, Cartão, Categoria, Busca
  - Grid compacto com 12 colunas
  - Ações: Editar, Duplicar, Excluir, Reconciliar
  - Totalizadores (Entradas, Saídas, Saldo)
  - Paginação (25 itens/página)
  - Exportação CSV

- **`tabs/WalletAccounts.tsx`** (Aba "Contas"):
  - Grid 1/2/3 colunas com cards de contas
  - Busca por nome
  - CRUD completo com drawers
  - Loading skeletons, empty states, toast notifications

- **`tabs/WalletFixed.tsx`** (Aba "Contas Fixas"):
  - Grid 1/2/3 colunas com cards de fixas
  - Filtros: Tipo, Status (ativo/inativo), Busca
  - Botão especial "Lançar fixas do mês"
  - CRUD completo com drawers
  - Loading skeletons, empty states, toast notifications

- **`tabs/WalletCardsTab.tsx`** (Aba "Cartões"):
  - ⚠️ Placeholder (a implementar)

- **`forms/CategoryForm.tsx`**: Formulário de categoria
  - Zod + RHF: nome (min 2 chars), tipo (expense/income)
  - Modo Criar/Editar automático
  - Toast de feedback

- **`forms/AccountForm.tsx`**: Formulário de conta
  - Zod + RHF: nome (min 2 chars), observações (opcional)
  - Modo Criar/Editar automático
  - Toast de feedback

- **`forms/FixedForm.tsx`**: Formulário de conta fixa
  - Zod + RHF: nome, tipo, valor (CurrencyInputBRL), dia (1-28)
  - Conta OU Cartão (validação exclusiva)
  - Categoria (opcional), Ativa (checkbox)
  - Modo Criar/Editar automático
  - Toast de feedback

- **`forms/TxForm.tsx`**: Formulário de transação
  - Usado nos drawers de Editar/Duplicar da aba Transações
  - ⚠️ Placeholder para integração completa

#### **Componentes Base (`/src/components/ui/`)**

- **`CardGlass.tsx`**: Card com efeito glassmorphism
  - Props: `title`, `actions`, `children`, `className`
  - Estilo: `.glass` com `rounded-2xl`, `border-white/10`, `backdrop-blur-md`
  - Header opcional com título e ações

- **`TabsPills.tsx`**: Tabs estilo pílula
  - Props: `items` (array de TabItem), `value`, `onChange`, `className`
  - Estilo ativo: `bg-[#D4AF37]` (dourado)
  - Estilo inativo: `bg-white/5` com hover

- **`Drawer.tsx`**: Side panel para formulários
  - Props: `open`, `onClose`, `title`, `children`
  - Overlay com `bg-black/60`
  - Panel 480px (mobile: full width)
  - Transição suave (translate-x)

- **`EmptyState.tsx`**: Estado vazio amigável
  - Props: `title`, `subtitle`, `action` (node)
  - Texto centralizado com espaçamento
  - CTA opcional (botão/link)

#### **Componentes de Form**

- **`/src/components/form/CurrencyInputBRL.tsx`**:
  - **Propósito:** Componente de input de moeda com máscara BRL em tempo real, utilizando `react-number-format`.
  - **Motivação Técnica:** 
    - Máscara profissional com cursor inteligente (posição correta ao digitar/deletar)
    - Conversão automática e precisa para centavos
    - Integração perfeita com React Hook Form via `Controller`
    - Substituição do `CurrencyInput` legado
  - **Funcionamento:**
    - **Input:** Aceita `value: number` (centavos) ou `string`
    - **Output:** `onValueChange: (cents: number) => void`
    - **Formatação:** R$ 1.234,56 (separador de milhar: ponto, decimal: vírgula)
    - **Opções:**
      - `interpretPlainDigitsAsCents={true}`: 2000 → R$ 20,00 (200 centavos)
      - `interpretPlainDigitsAsCents={false}` (padrão): 2000 → R$ 2.000,00 (200.000 centavos)
  - **Integração com RHF:**
    ```tsx
    <Controller
      name="amountCents"
      control={control}
      render={({ field }) => (
        <CurrencyInputBRL
          value={field.value}
          onValueChange={field.onChange}
        />
      )}
    />
    ```
  - **Usado em:** `/transacoes`, `/fixas`, `/faturas`, `/emprestimos/[id]`

- **`/src/components/ui/CurrencyInput.tsx`** (Legacy):
  - **Status:** Mantido para compatibilidade com páginas antigas
  - **Substituição em Progresso:** Migrar para `CurrencyInputBRL` onde possível

- **`/src/components/MoneyCard.tsx`**:
  - **Propósito:** Card reutilizável para exibir valores monetários no dashboard.
  - **Props:** `title`, `value` (centavos), `subtitle`, `tooltip`

- **`/src/components/RecentActivity.tsx`**:
  - **Propósito:** Exibe o feed de atividades recentes (finanças + digital + empréstimos).
  - **Características:** Ícones por tipo, formatação de valores, ordenação por data.

- **`/src/components/RecentFinance.tsx`**:
  - **Propósito:** Exibe atividades recentes filtradas apenas para finanças.
  - **Utilizado em:** `/transacoes` como painel lateral.

### Componentes de Dashboard Digital

- **`/src/components/digital/DigitalKpi.tsx`**:
  - **Propósito:** Card individual para exibir uma métrica digital (KPI).
  - **Props:**
    - `title`: string - Nome do KPI (ex: "Gasto Total", "ROI")
    - `valueText`: string - Valor formatado para exibição
    - `subtleText?`: string - Texto auxiliar (ex: "5 vendas")
    - `state?`: 'danger' | 'ok' | 'warning' | 'default' - Define cor do valor
    - `isLoading?`: boolean - Exibe skeleton loader
    - `isError?`: boolean - Exibe mensagem de erro
    - `onRetry?`: () => void - Callback para botão "Tentar de novo"
  - **Estilização:**
    - Fundo: `.glass` com `rounded-xl2`
    - Cores dinâmicas:
      - `danger`: `text-red-400` (prejuízo, gastos)
      - `ok`: `text-green-400` (lucro, receitas)
      - `warning`: `text-yellow-300` (alerta)
      - `default`: `text-white` (neutro)

- **`/src/components/digital/DigitalKpiRow.tsx`**:
  - **Propósito:** Container para exibir linha de 5 KPIs digitais.
  - **Props:**
    - `userId`: string | null
    - `from`: string (ISO YYYY-MM-DD)
    - `to`: string (ISO YYYY-MM-DD)
  - **Hook Utilizado:** `useDigitalKpis({ from, to })`
  - **Layout:** Grid responsivo (1 col mobile → 5 col desktop)
  - **KPIs Renderizados:**
    1. Gasto Total (vermelho)
    2. Receita Total (verde)
    3. ROI (cor dinâmica por performance)
    4. CAC (cor dinâmica, comparado com Ticket)
    5. Ticket Médio (padrão)

- **`/src/components/digital/TopOffers.tsx`**:
  - **Propósito:** Tabela com ranking das top 5 ofertas por performance.
  - **Props:**
    - `userId`: string | null
    - `from`: string (ISO)
    - `to`: string (ISO)
    - `limit?`: number (padrão: 5)
  - **Hook Utilizado:** `useTopOffers({ from, to, limit })`
  - **Colunas:** #, Oferta, Gasto, Receita, ROI, Vendas
  - **Ordenação:** Por lucro (receita - gasto) descendente
  - **Estados:** Loading (skeleton), Erro (retry), Vazio (mensagem)

### Componentes de Layout Específicos

- **`/src/components/dashboard/DashboardHeader.tsx`**:
  - **Propósito:** Header estático exclusivo da página de Dashboard.
  - **Características:**
    - **Posicionamento:** Estático (rola com a página, não é fixed)
    - **Conteúdo:**
      - Título: "Bem vindo de volta, Membro"
      - Subtítulo: "Gerencie Seu imperio Financeiro Aqui"
      - Filtros De/Até: Inputs de data com chips `.glass`
    - **Sincronização:**
      - Lê `from` e `to` da URL ao montar (via `useSearchParams`)
      - Atualiza URL quando usuário muda filtros (via `router.replace`)
      - Store Zustand (`useDateRange`) é a fonte da verdade
    - **URL Pattern:** `/?from=YYYY-MM-DD&to=YYYY-MM-DD`
    - **Deep Linking:** URLs compartilháveis com período específico
  - **Layout:** Flexbox com título à esquerda, filtros à direita
  - **Responsividade:** Filtros empilham verticalmente em telas menores
  - **Usado em:** Apenas `/` (Dashboard principal)

---

## 11. Resumo de Funcionalidades Principais

### Módulo de Finanças Pessoais
✅ **Contas e Cartões:** CRUD completo com gestão de saldos e limites  
✅ **Transações:** Despesas, receitas e transferências com validação robusta  
✅ **Categorias:** Sistema flexível com arquivamento (soft delete)  
✅ **Orçamento Mensal:** Definição inline no dashboard com barra de progresso  
✅ **Contas Fixas:** Lançamento automático mensal com controle de duplicatas  
✅ **Faturas de Cartão:** Cálculo de ciclos e pagamento integrado  
✅ **Filtros Avançados:** Busca por conta, cartão, categoria e texto  
✅ **Exportação CSV:** Download de extratos filtrados  
✅ **Hub Carteira (`/carteira`):** Página centralizada com 6 abas:
  - **Geral:** Visão resumida (transações recentes, contas, cartões)
  - **Categorias:** CRUD com filtros (tipo, busca)
  - **Transações:** Listagem paginada com filtros avançados e reconciliação
  - **Contas:** CRUD com busca e observações
  - **Contas Fixas:** CRUD com lançamento mensal idempotente
  - **Cartões:** Placeholder (a implementar)
✅ **Componentes Reutilizáveis:** CardGlass, TabsPills, Drawer, EmptyState  
✅ **Store de Busca:** `useWalletSearch` compartilhado entre abas  
✅ **Reconciliação:** Toggle de status `reconciled` em transações

### Módulo Digital
✅ **Ofertas:** Gestão de produtos/serviços com métricas de performance  
✅ **Gastos e Vendas:** Registro manual e via webhook (Kiwify)  
✅ **Sessões de Trabalho:** Controle de tempo investido  
✅ **Métricas:** ROI, CAC, Ticket Médio, lucro por oferta  
✅ **Ranking:** Top 5 ofertas mais lucrativas do mês  
✅ **Webhook Kiwify:** Integração automatizada com validação HMAC

### Módulo de Empréstimos
✅ **Modelo de Eventos:** Sistema flexível (emprestei/recebi/juros)  
✅ **Cálculo Automático:** Saldos calculados via view do banco  
✅ **Timeline Visual:** Histórico com emojis e formatação  
✅ **Status Inteligente:** Badges coloridos (a receber/você deve/quitado)  
✅ **Total no Dashboard:** Card mostrando valor total a receber

### Dashboard e Análises
✅ **SDM (Saldo Disponível no Mês):** Cálculo automático  
✅ **Pode Gastar Hoje:** Baseado em orçamento ou SDM  
✅ **Feed de Atividades:** Integração de todas as movimentações  
✅ **Filtros de Período:** Sistema completo com Store Zustand + sincronização URL  
✅ **Seção Desempenho Digital:** KPIs (Gasto, Receita, ROI, CAC, Ticket) + Top 5 Ofertas  
✅ **TanStack Query:** Cache inteligente e invalidação granular  
✅ **Deep Linking:** URLs compartilháveis com período selecionado

### Segurança e Performance
✅ **Row Level Security (RLS):** Em todas as tabelas  
✅ **Validação Dupla:** Client-side (Zod) + Server-side (Postgres)  
✅ **Valores em Centavos:** Precisão monetária garantida  
✅ **Queries Paralelas:** `Promise.all` para otimização  
✅ **Índices Otimizados:** Performance em consultas complexas  
✅ **Service Role Key:** Apenas em API routes server-side (nunca no cliente)  
✅ **Admin Whitelist:** Controle granular de acesso administrativo  
✅ **Rate Limiting:** Proteção contra abuso (10 criações/hora)  
✅ **Autenticação Segura:** Email/senha com validação Supabase Auth  
✅ **Middleware de Navegação:** Proteção automática de rotas + redirect inteligente  
✅ **Edge Runtime:** Middleware roda no Edge para máxima performance

### UX e Usabilidade
✅ **Toast de Feedback:** Mensagens de sucesso/erro com auto-dismiss  
✅ **Loading States:** Skeletons e botões desabilitados  
✅ **Estados Vazios:** Mensagens elegantes e CTAs claros  
✅ **Responsive Design:** Mobile-first com Tailwind CSS  
✅ **Formulários Inteligentes:** Validação em tempo real com RHF + Zod  
✅ **Inputs Monetários Profissionais:** Máscara BRL com `react-number-format`, cursor inteligente  
✅ **Design System NoCry Group:** Paleta dourada, glassmorphism, gradientes radiais  
✅ **Sidebar Colapsável:** 72px → 264px (hover), animação CSS suave  
✅ **Header do Dashboard:** Estático com filtros De/Até, sincronização Store + URL  
✅ **Cards de KPI:** Efeito glass sobre gradiente, ícones em containers quadrados  
✅ **KPIs com Cores Dinâmicas:** Verde/amarelo/vermelho baseado em performance (ROI, CAC)  
✅ **Página de Login Branded:** Logo NoCry, card com borda dourada, fundo preto  
✅ **Navegação Inteligente:** Middleware + Group Layout (proteção em camadas)  
✅ **Optimistic Updates:** Edição de orçamento com feedback instantâneo  
✅ **Invalidação Granular:** TanStack Query invalida apenas as queries necessárias  
✅ **State Management Global:** Zustand para filtros de data (leve, type-safe, performático)

---

## 12. Documentação Adicional

Para informações detalhadas sobre funcionalidades específicas, consulte:

- **`docs/feature-orcamento.md`** - Sistema de orçamento mensal
- **`docs/feature-emprestimos.md`** - Sistema de empréstimos pessoa-a-pessoa
- **`docs/loans-examples.ts`** - Exemplos práticos de uso de empréstimos
- **`docs/changelog.md`** - Histórico de mudanças e sprints

---

## 13. Próximas Melhorias Sugeridas

### Curto Prazo
- [ ] Gráficos de evolução mensal (receitas vs despesas)
- [ ] Metas de economia por categoria
- [ ] Notificações de vencimento de contas
- [ ] App mobile com React Native

### Médio Prazo
- [ ] Integração com Open Banking
- [ ] Importação de OFX/CSV bancários
- [ ] Relatórios PDF mensais
- [ ] Dashboard de investimentos

### Longo Prazo
- [ ] IA para sugestões de economia
- [ ] Previsão de fluxo de caixa
- [ ] Multi-usuário (famílias)
- [ ] Sincronização automática com bancos
